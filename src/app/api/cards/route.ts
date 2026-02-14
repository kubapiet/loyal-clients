import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateCardNumber } from "@/lib/utils";
import QRCode from "qrcode";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = (session.user as any).companyId;
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const where = {
      companyId,
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: "insensitive" as const } },
          { lastName: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
          { cardNumber: { contains: search, mode: "insensitive" as const } },
          { phone: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [cards, total] = await Promise.all([
      prisma.loyaltyCard.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          _count: { select: { transactions: true } },
        },
      }),
      prisma.loyaltyCard.count({ where }),
    ]);

    return NextResponse.json({
      cards,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get cards error:", error);
    return NextResponse.json({ error: "Wystąpił błąd" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = (session.user as any).companyId;
    const { firstName, lastName, email, phone } = await req.json();

    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: "Imię, nazwisko i email są wymagane" },
        { status: 400 }
      );
    }

    const cardNumber = generateCardNumber();
    
    const card = await prisma.loyaltyCard.create({
      data: {
        cardNumber,
        firstName,
        lastName,
        email,
        phone: phone || null,
        companyId,
      },
    });

    return NextResponse.json(card, { status: 201 });
  } catch (error) {
    console.error("Create card error:", error);
    return NextResponse.json({ error: "Wystąpił błąd" }, { status: 500 });
  }
}
