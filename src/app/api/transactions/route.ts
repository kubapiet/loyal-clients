import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = (session.user as any).companyId;
    const { searchParams } = new URL(req.url);
    const cardId = searchParams.get("cardId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const search = searchParams.get("search");

    const where = {
      loyaltyCard: {
        companyId,
        ...(search && {
          OR: [
            { firstName: { contains: search, mode: "insensitive" as const } },
            { lastName: { contains: search, mode: "insensitive" as const } },
            { cardNumber: { contains: search, mode: "insensitive" as const } },
          ],
        }),
      },
      ...(cardId && { loyaltyCardId: cardId }),
    };

    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";

    const allowedSortFields: Record<string, any> = {
      createdAt: { createdAt: sortDir },
      amount: { amount: sortDir },
      points: { points: sortDir },
      type: { type: sortDir },
      customer: { loyaltyCard: { lastName: sortDir } },
    };

    const orderBy = allowedSortFields[sortBy] || { createdAt: "desc" };

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          loyaltyCard: {
            select: { firstName: true, lastName: true, cardNumber: true },
          },
        },
      }),
      prisma.transaction.count({ where }),
    ]);

    return NextResponse.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get transactions error:", error);
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
    const { loyaltyCardId, amount, type, description } = await req.json();

    if (!loyaltyCardId || amount === undefined || !type) {
      return NextResponse.json(
        { error: "ID karty, kwota i typ są wymagane" },
        { status: 400 }
      );
    }

    // Verify card belongs to company
    const card = await prisma.loyaltyCard.findFirst({
      where: { id: loyaltyCardId, companyId },
    });

    if (!card) {
      return NextResponse.json({ error: "Karta nie znaleziona" }, { status: 404 });
    }

    const points = type === "REFUND" || type === "MANUAL_SUBTRACT"
      ? -Math.abs(Math.round(amount))
      : Math.abs(Math.round(amount));

    const transaction = await prisma.transaction.create({
      data: {
        amount: parseFloat(amount.toString()),
        points,
        type,
        description: description || null,
        loyaltyCardId,
      },
    });

    // Update card total points
    await prisma.loyaltyCard.update({
      where: { id: loyaltyCardId },
      data: {
        totalPoints: { increment: points },
      },
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error("Create transaction error:", error);
    return NextResponse.json({ error: "Wystąpił błąd" }, { status: 500 });
  }
}
