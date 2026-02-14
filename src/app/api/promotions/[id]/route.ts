import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = (session.user as any).companyId;
    const { title, description, startDate, endDate, couponCode } = await req.json();

    const existing = await prisma.promotion.findFirst({
      where: { id: params.id, companyId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Promocja nie znaleziona" }, { status: 404 });
    }

    const promotion = await prisma.promotion.update({
      where: { id: params.id },
      data: {
        title,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        couponCode: couponCode || null,
      },
    });

    return NextResponse.json(promotion);
  } catch (error) {
    console.error("Update promotion error:", error);
    return NextResponse.json({ error: "Wystąpił błąd" }, { status: 500 });
  }
}

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
    const existing = await prisma.promotion.findFirst({
      where: { id: params.id, companyId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Promocja nie znaleziona" }, { status: 404 });
    }

    await prisma.promotion.delete({ where: { id: params.id } });

    return NextResponse.json({ message: "Promocja usunięta" });
  } catch (error) {
    console.error("Delete promotion error:", error);
    return NextResponse.json({ error: "Wystąpił błąd" }, { status: 500 });
  }
}
