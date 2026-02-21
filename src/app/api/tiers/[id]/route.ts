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
    const role = (session.user as any).role;
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = (session.user as any).companyId;
    const actor = buildAuditActor(session.user as any);
    const { minPoints, discountPercent, label } = await req.json();

    const existing = await prisma.discountTier.findFirst({
      where: { id: params.id, companyId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Próg nie znaleziony" }, { status: 404 });
    }

    const tier = await prisma.$transaction(async (tx) => {
      const updatedTier = await tx.discountTier.update({
        where: { id: params.id },
        data: {
          minPoints: parseInt(minPoints.toString()),
          discountPercent: parseFloat(discountPercent.toString()),
          label: label || null,
        },
      });

      await enforceAuditRetention(tx, companyId);
      await writeAuditLog(tx, {
        companyId,
        ...actor,
        action: "UPDATE",
        entityType: "TIER",
        entityId: updatedTier.id,
        entityLabel: `${updatedTier.minPoints} pts / ${updatedTier.discountPercent}%`,
        summary: `Updated discount tier ${updatedTier.id}`,
        changes: buildChanges(
          existing as unknown as Record<string, unknown>,
          updatedTier as unknown as Record<string, unknown>,
          ["minPoints", "discountPercent", "label"]
        ),
      });

      return updatedTier;
    });

    return NextResponse.json(tier);
  } catch (error) {
    console.error("Update tier error:", error);
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
    const role = (session.user as any).role;
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = (session.user as any).companyId;
    const actor = buildAuditActor(session.user as any);
    const existing = await prisma.discountTier.findFirst({
      where: { id: params.id, companyId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Próg nie znaleziony" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.discountTier.delete({ where: { id: params.id } });

      await enforceAuditRetention(tx, companyId);
      await writeAuditLog(tx, {
        companyId,
        ...actor,
        action: "DELETE",
        entityType: "TIER",
        entityId: existing.id,
        entityLabel: `${existing.minPoints} pts / ${existing.discountPercent}%`,
        summary: `Deleted discount tier ${existing.id}`,
        changes: buildChanges(
          existing as unknown as Record<string, unknown>,
          null,
          ["minPoints", "discountPercent", "label"]
        ),
      });
    });

    return NextResponse.json({ message: "Próg usunięty" });
  } catch (error) {
    console.error("Delete tier error:", error);
    return NextResponse.json({ error: "Wystąpił błąd" }, { status: 500 });
  }
}
