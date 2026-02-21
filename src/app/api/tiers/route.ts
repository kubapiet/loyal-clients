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
    const role = (session.user as any).role;
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    const role = (session.user as any).role;
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = (session.user as any).companyId;
    const actor = buildAuditActor(session.user as any);
    const { minPoints, discountPercent, label } = await req.json();

    if (minPoints === undefined || discountPercent === undefined) {
      return NextResponse.json(
        { error: "Minimalna liczba punktów i procent rabatu są wymagane" },
        { status: 400 }
      );
    }

    const tier = await prisma.$transaction(async (tx) => {
      const createdTier = await tx.discountTier.create({
        data: {
          minPoints: parseInt(minPoints.toString()),
          discountPercent: parseFloat(discountPercent.toString()),
          label: label || null,
          companyId,
        },
      });

      await enforceAuditRetention(tx, companyId);
      await writeAuditLog(tx, {
        companyId,
        ...actor,
        action: "CREATE",
        entityType: "TIER",
        entityId: createdTier.id,
        entityLabel: `${createdTier.minPoints} pts / ${createdTier.discountPercent}%`,
        summary: `Created discount tier ${createdTier.minPoints} points`,
        changes: buildChanges(
          null,
          createdTier as unknown as Record<string, unknown>,
          ["minPoints", "discountPercent", "label"]
        ),
      });

      return createdTier;
    });

    return NextResponse.json(tier, { status: 201 });
  } catch (error) {
    console.error("Create tier error:", error);
    return NextResponse.json({ error: "Wystąpił błąd" }, { status: 500 });
  }
}
