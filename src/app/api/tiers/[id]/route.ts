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
    const { minPoints, discountPercent, label } = await req.json();

    const existing = await prisma.discountTier.findFirst({
      where: { id: params.id, companyId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Próg nie znaleziony" }, { status: 404 });
    }

    const tier = await prisma.discountTier.update({
      where: { id: params.id },
      data: {
        minPoints: parseInt(minPoints.toString()),
        discountPercent: parseFloat(discountPercent.toString()),
        label: label || null,
      },
    });

    return NextResponse.json(tier);
  } catch (error) {
    console.error("Update tier error:", error);
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
    const existing = await prisma.discountTier.findFirst({
      where: { id: params.id, companyId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Próg nie znaleziony" }, { status: 404 });
    }

    await prisma.discountTier.delete({ where: { id: params.id } });

    return NextResponse.json({ message: "Próg usunięty" });
  } catch (error) {
    console.error("Delete tier error:", error);
    return NextResponse.json({ error: "Wystąpił błąd" }, { status: 500 });
  }
}
