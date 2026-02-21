import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import QRCode from "qrcode";

export async function GET(
  req: NextRequest,
  { params }: { params: { cardId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cardId = (session.user as any).cardId || params.cardId;

    const card = await prisma.loyaltyCard.findUnique({
      where: { id: cardId },
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        company: {
          select: {
            name: true,
            discountTiers: {
              orderBy: { minPoints: "asc" },
            },
            promotions: {
              where: {
                startDate: { lte: new Date() },
                endDate: { gte: new Date() },
              },
              orderBy: { endDate: "asc" },
            },
          },
        },
      },
    });

    if (!card) {
      return NextResponse.json({ error: "Karta nie znaleziona" }, { status: 404 });
    }

    const qrCode = await QRCode.toDataURL(card.cardNumber, {
      width: 300,
      margin: 2,
    });

    return NextResponse.json({ ...card, qrCode });
  } catch (error) {
    console.error("Customer data error:", error);
    return NextResponse.json({ error: "Wystąpił błąd" }, { status: 500 });
  }
}
