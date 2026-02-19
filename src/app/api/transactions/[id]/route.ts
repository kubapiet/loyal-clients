import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildAuditActor, buildChanges, enforceAuditRetention, writeAuditLog } from "@/lib/audit-log";

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

    const transaction = await prisma.transaction.findFirst({
      where: {
        id: params.id,
        loyaltyCard: { companyId },
      },
      include: {
        loyaltyCard: {
          select: {
            cardNumber: true,
          },
        },
      },
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transakcja nie znaleziona" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.loyaltyCard.update({
        where: { id: transaction.loyaltyCardId },
        data: {
          totalPoints: { decrement: transaction.points },
        },
      });

      await tx.transaction.delete({ where: { id: params.id } });

      await enforceAuditRetention(tx, companyId);
      await writeAuditLog(tx, {
        companyId,
        ...actor,
        action: "DELETE",
        entityType: "TRANSACTION",
        entityId: transaction.id,
        entityLabel: `${transaction.loyaltyCard.cardNumber} (${transaction.type})`,
        summary: `Deleted transaction from card ${transaction.loyaltyCard.cardNumber}`,
        changes: buildChanges(
          transaction as unknown as Record<string, unknown>,
          null,
          ["amount", "points", "type", "description", "loyaltyCardId"]
        ),
      });
    });

    return NextResponse.json({ message: "Transakcja usunięta" });
  } catch (error) {
    console.error("Delete transaction error:", error);
    return NextResponse.json({ error: "Wystąpił błąd" }, { status: 500 });
  }
}
