import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildAuditActor, buildChanges, enforceAuditRetention, writeAuditLog } from "@/lib/audit-log";

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
    const { title, description, startDate, endDate, couponCode } = await req.json();

    const existing = await prisma.promotion.findFirst({
      where: { id: params.id, companyId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Promocja nie znaleziona" }, { status: 404 });
    }

    const promotion = await prisma.$transaction(async (tx) => {
      const updatedPromotion = await tx.promotion.update({
        where: { id: params.id },
        data: {
          title,
          description,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          couponCode: couponCode || null,
        },
      });

      await enforceAuditRetention(tx, companyId);
      await writeAuditLog(tx, {
        companyId,
        ...actor,
        action: "UPDATE",
        entityType: "PROMOTION",
        entityId: updatedPromotion.id,
        entityLabel: updatedPromotion.title,
        summary: `Updated promotion ${updatedPromotion.title}`,
        changes: buildChanges(
          existing as unknown as Record<string, unknown>,
          updatedPromotion as unknown as Record<string, unknown>,
          ["title", "description", "startDate", "endDate", "couponCode"]
        ),
      });

      return updatedPromotion;
    });

    return NextResponse.json(promotion);
  } catch (error) {
    console.error("Update promotion error:", error);
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
    const existing = await prisma.promotion.findFirst({
      where: { id: params.id, companyId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Promocja nie znaleziona" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.promotion.delete({ where: { id: params.id } });

      await enforceAuditRetention(tx, companyId);
      await writeAuditLog(tx, {
        companyId,
        ...actor,
        action: "DELETE",
        entityType: "PROMOTION",
        entityId: existing.id,
        entityLabel: existing.title,
        summary: `Deleted promotion ${existing.title}`,
        changes: buildChanges(
          existing as unknown as Record<string, unknown>,
          null,
          ["title", "description", "startDate", "endDate", "couponCode"]
        ),
      });
    });

    return NextResponse.json({ message: "Promocja usunięta" });
  } catch (error) {
    console.error("Delete promotion error:", error);
    return NextResponse.json({ error: "Wystąpił błąd" }, { status: 500 });
  }
}
