import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import QRCode from "qrcode";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const card = await prisma.loyaltyCard.findUnique({
      where: { id: params.id },
    });

    if (!card) {
      return NextResponse.json({ error: "Karta nie znaleziona" }, { status: 404 });
    }

    const qrDataUrl = await QRCode.toDataURL(card.cardNumber, {
      width: 300,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });

    return NextResponse.json({ qrCode: qrDataUrl, cardNumber: card.cardNumber });
  } catch (error) {
    console.error("QR code error:", error);
    return NextResponse.json({ error: "Wystąpił błąd" }, { status: 500 });
  }
}
