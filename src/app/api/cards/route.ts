import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateCardNumber } from "@/lib/utils";
import { buildAuditActor, buildChanges, enforceAuditRetention, writeAuditLog } from "@/lib/audit-log";
import { isValidCity } from "@/lib/cities";

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
          { city: { contains: search, mode: "insensitive" as const } },
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
    return NextResponse.json({ error: "Wystapil blad" }, { status: 500 });
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
    const { firstName, lastName, email, phone, city } = await req.json();

    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: "Imie, nazwisko i email sa wymagane" },
        { status: 400 }
      );
    }

    if (!city) {
      return NextResponse.json({ error: "Miasto jest wymagane" }, { status: 400 });
    }

    if (!isValidCity(city)) {
      return NextResponse.json({ error: "Nieprawidlowe miasto" }, { status: 400 });
    }

    const cardNumber = generateCardNumber();

    const card = await prisma.$transaction(async (tx) => {
      const createdCard = await tx.loyaltyCard.create({
        data: {
          cardNumber,
          firstName,
          lastName,
          email,
          phone: phone || null,
          city: city || null,
          companyId,
        },
      });

      await enforceAuditRetention(tx, companyId);
      await writeAuditLog(tx, {
        companyId,
        ...actor,
        action: "CREATE",
        entityType: "CARD",
        entityId: createdCard.id,
        entityLabel: `${createdCard.firstName} ${createdCard.lastName} (${createdCard.cardNumber})`,
        summary: `Created loyalty card ${createdCard.cardNumber}`,
        changes: buildChanges(
          null,
          createdCard as unknown as Record<string, unknown>,
          ["cardNumber", "firstName", "lastName", "email", "phone", "city", "totalPoints"]
        ),
      });

      return createdCard;
    });

    return NextResponse.json(card, { status: 201 });
  } catch (error) {
    console.error("Create card error:", error);
    return NextResponse.json({ error: "Wystapil blad" }, { status: 500 });
  }
}
