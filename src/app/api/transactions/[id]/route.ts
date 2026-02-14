import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const transaction = await prisma.transaction.findFirst({
      where: {
        id: params.id,
        loyaltyCard: { companyId },
      },
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transakcja nie znaleziona" }, { status: 404 });
    }

    // Revert points from the card
    await prisma.loyaltyCard.update({
      where: { id: transaction.loyaltyCardId },
      data: {
        totalPoints: { decrement: transaction.points },
      },
    });

    await prisma.transaction.delete({ where: { id: params.id } });

    return NextResponse.json({ message: "Transakcja usunięta" });
  } catch (error) {
    console.error("Delete transaction error:", error);
    return NextResponse.json({ error: "Wystąpił błąd" }, { status: 500 });
  }
}
