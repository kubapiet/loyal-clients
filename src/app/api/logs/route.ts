import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const allowedActions = new Set(["CREATE", "UPDATE", "DELETE"]);
const allowedEntityTypes = new Set(["CARD", "TRANSACTION", "TIER", "PROMOTION", "USER"]);
const allowedActorRoles = new Set(["COMPANY", "ADMIN", "EMPLOYEE"]);

function parseDateStart(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDateEndExclusive(value: string) {
  const start = parseDateStart(value);
  if (!start) return null;
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (role !== "COMPANY" && role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = (session.user as any).companyId;
    const { searchParams } = new URL(req.url);

    const parsedPage = parseInt(searchParams.get("page") || "1", 10);
    const parsedLimit = parseInt(searchParams.get("limit") || "20", 10);
    const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const rawLimit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 20;
    const limit = Math.min(100, rawLimit);
    const skip = (page - 1) * limit;

    const search = (searchParams.get("search") || "").trim();
    const action = (searchParams.get("action") || "").trim();
    const entityType = (searchParams.get("entityType") || "").trim();
    const actorRole = (searchParams.get("actorRole") || "").trim();
    const dateFrom = (searchParams.get("dateFrom") || "").trim();
    const dateTo = (searchParams.get("dateTo") || "").trim();

    const where: any = { companyId };

    if (allowedActions.has(action)) {
      where.action = action;
    }

    if (allowedEntityTypes.has(entityType)) {
      where.entityType = entityType;
    }

    if (allowedActorRoles.has(actorRole)) {
      where.actorRole = actorRole;
    }

    const createdAt: Record<string, Date> = {};
    if (dateFrom) {
      const parsed = parseDateStart(dateFrom);
      if (parsed) createdAt.gte = parsed;
    }
    if (dateTo) {
      const parsed = parseDateEndExclusive(dateTo);
      if (parsed) createdAt.lt = parsed;
    }
    if (Object.keys(createdAt).length > 0) {
      where.createdAt = createdAt;
    }

    if (search) {
      where.OR = [
        { actorName: { contains: search, mode: "insensitive" as const } },
        { actorEmail: { contains: search, mode: "insensitive" as const } },
        { entityLabel: { contains: search, mode: "insensitive" as const } },
        { entityId: { contains: search, mode: "insensitive" as const } },
        { summary: { contains: search, mode: "insensitive" as const } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get logs error:", error);
    return NextResponse.json({ error: "Wystapil blad" }, { status: 500 });
  }
}
