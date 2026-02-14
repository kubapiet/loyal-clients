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

    const tiers = await prisma.discountTier.findMany({
      where: { companyId },
      orderBy: { minPoints: "asc" },
    });

    return NextResponse.json(tiers);
  } catch (error) {
    console.error("Get tiers error:", error);
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
    const { minPoints, discountPercent, label } = await req.json();

    if (minPoints === undefined || discountPercent === undefined) {
      return NextResponse.json(
        { error: "Minimalna liczba punktów i procent rabatu są wymagane" },
        { status: 400 }
      );
    }

    const tier = await prisma.discountTier.create({
      data: {
        minPoints: parseInt(minPoints.toString()),
        discountPercent: parseFloat(discountPercent.toString()),
        label: label || null,
        companyId,
      },
    });

    return NextResponse.json(tier, { status: 201 });
  } catch (error) {
    console.error("Create tier error:", error);
    return NextResponse.json({ error: "Wystąpił błąd" }, { status: 500 });
  }
}
