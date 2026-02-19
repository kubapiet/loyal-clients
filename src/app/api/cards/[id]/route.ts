import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildAuditActor, buildChanges, enforceAuditRetention, writeAuditLog } from "@/lib/audit-log";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = (session.user as any).companyId;
    const card = await prisma.loyaltyCard.findFirst({
      where: { id: params.id, companyId },
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    if (!card) {
      return NextResponse.json({ error: "Karta nie znaleziona" }, { status: 404 });
    }

    const discountTiers = await prisma.discountTier.findMany({
      where: { companyId },
      orderBy: { minPoints: "asc" },
    });

    const currentTier = discountTiers
      .filter((tier) => card.totalPoints >= tier.minPoints)
      .at(-1) ?? null;

    const nextTier = discountTiers
      .find((tier) => tier.minPoints > card.totalPoints) ?? null;

    return NextResponse.json({ ...card, discountTier: currentTier, nextDiscountTier: nextTier });
  } catch (error) {
    console.error("Get card error:", error);
    return NextResponse.json({ error: "Wystąpił błąd" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = (session.user as any).companyId;
    const actor = buildAuditActor(session.user as any);
    const { firstName, lastName, email, phone } = await req.json();

    const existing = await prisma.loyaltyCard.findFirst({
      where: { id: params.id, companyId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Karta nie znaleziona" }, { status: 404 });
    }

    const card = await prisma.$transaction(async (tx) => {
      const updatedCard = await tx.loyaltyCard.update({
        where: { id: params.id },
        data: { firstName, lastName, email, phone },
      });

      await enforceAuditRetention(tx, companyId);
      await writeAuditLog(tx, {
        companyId,
        ...actor,
        action: "UPDATE",
        entityType: "CARD",
        entityId: updatedCard.id,
        entityLabel: `${updatedCard.firstName} ${updatedCard.lastName} (${updatedCard.cardNumber})`,
        summary: `Updated loyalty card ${updatedCard.cardNumber}`,
        changes: buildChanges(
          existing as unknown as Record<string, unknown>,
          updatedCard as unknown as Record<string, unknown>,
          ["firstName", "lastName", "email", "phone", "totalPoints"]
        ),
      });

      return updatedCard;
    });

    return NextResponse.json(card);
  } catch (error) {
    console.error("Update card error:", error);
    return NextResponse.json({ error: "Wystąpił błąd" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = (session.user as any).companyId;
    const actor = buildAuditActor(session.user as any);
    const existing = await prisma.loyaltyCard.findFirst({
      where: { id: params.id, companyId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Karta nie znaleziona" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.loyaltyCard.delete({ where: { id: params.id } });

      await enforceAuditRetention(tx, companyId);
      await writeAuditLog(tx, {
        companyId,
        ...actor,
        action: "DELETE",
        entityType: "CARD",
        entityId: existing.id,
        entityLabel: `${existing.firstName} ${existing.lastName} (${existing.cardNumber})`,
        summary: `Deleted loyalty card ${existing.cardNumber}`,
        changes: buildChanges(
          existing as unknown as Record<string, unknown>,
          null,
          ["cardNumber", "firstName", "lastName", "email", "phone", "totalPoints"]
        ),
      });
    });

    return NextResponse.json({ message: "Karta usunięta" });
  } catch (error) {
    console.error("Delete card error:", error);
    return NextResponse.json({ error: "Wystąpił błąd" }, { status: 500 });
  }
}
