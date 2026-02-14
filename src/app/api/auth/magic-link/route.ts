import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { email, cardNumber } = await req.json();

    if (!email && !cardNumber) {
      return NextResponse.json(
        { error: "Email lub numer karty jest wymagany" },
        { status: 400 }
      );
    }

    const card = cardNumber
      ? await prisma.loyaltyCard.findUnique({ where: { cardNumber } })
      : await prisma.loyaltyCard.findFirst({ where: { email } });

    if (!card) {
      return NextResponse.json(
        { error: "Nie znaleziono karty" },
        { status: 404 }
      );
    }

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await prisma.magicLink.create({
      data: {
        token,
        email: card.email,
        cardId: card.id,
        expiresAt,
      },
    });

    // In production, send email with the magic link
    const magicLinkUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/customer/verify?token=${token}`;

    // For development, log the link
    console.log("Magic Link URL:", magicLinkUrl);

    return NextResponse.json({
      message: "Link logowania został wysłany na email",
      // Only include in development
      ...(process.env.NODE_ENV === "development" && { debugToken: token }),
    });
  } catch (error) {
    console.error("Magic link error:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd" },
      { status: 500 }
    );
  }
}
