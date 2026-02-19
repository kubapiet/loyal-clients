import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildAuditActor, buildChanges, enforceAuditRetention, writeAuditLog } from "@/lib/audit-log";

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

    const where: any = {
      loyaltyCard: {
        companyId,
      },
      ...(cardId && { loyaltyCardId: cardId }),
      ...(search && {
        OR: [
          { description: { contains: search, mode: "insensitive" as const } },
          { loyaltyCard: { firstName: { contains: search, mode: "insensitive" as const } } },
          { loyaltyCard: { lastName: { contains: search, mode: "insensitive" as const } } },
          { loyaltyCard: { cardNumber: { contains: search, mode: "insensitive" as const } } },
        ],
      }),
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
    const actor = buildAuditActor(session.user as any);
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

    const transaction = await prisma.$transaction(async (tx) => {
      const createdTransaction = await tx.transaction.create({
        data: {
          amount: parseFloat(amount.toString()),
          points,
          type,
          description: description || null,
          loyaltyCardId,
        },
      });

      await tx.loyaltyCard.update({
        where: { id: loyaltyCardId },
        data: {
          totalPoints: { increment: points },
        },
      });

      await enforceAuditRetention(tx, companyId);
      await writeAuditLog(tx, {
        companyId,
        ...actor,
        action: "CREATE",
        entityType: "TRANSACTION",
        entityId: createdTransaction.id,
        entityLabel: `${card.cardNumber} (${type})`,
        summary: `Created transaction for card ${card.cardNumber}`,
        changes: buildChanges(
          null,
          createdTransaction as unknown as Record<string, unknown>,
          ["amount", "points", "type", "description", "loyaltyCardId"]
        ),
      });

      return createdTransaction;
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error("Create transaction error:", error);
    return NextResponse.json({ error: "Wystąpił błąd" }, { status: 500 });
  }
}
