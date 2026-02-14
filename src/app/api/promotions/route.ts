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
    const activeOnly = searchParams.get("active") === "true";

    const where = {
      companyId,
      ...(activeOnly && {
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      }),
    };

    const promotions = await prisma.promotion.findMany({
      where,
      orderBy: { startDate: "desc" },
    });

    return NextResponse.json(promotions);
  } catch (error) {
    console.error("Get promotions error:", error);
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
    const { title, description, startDate, endDate, couponCode } = await req.json();

    if (!title || !description || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Tytuł, opis, data rozpoczęcia i data zakończenia są wymagane" },
        { status: 400 }
      );
    }

    const promotion = await prisma.promotion.create({
      data: {
        title,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        couponCode: couponCode || null,
        companyId,
      },
    });

    return NextResponse.json(promotion, { status: 201 });
  } catch (error) {
    console.error("Create promotion error:", error);
    return NextResponse.json({ error: "Wystąpił błąd" }, { status: 500 });
  }
}
