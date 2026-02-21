import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { hash } from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildAuditActor, buildChanges, enforceAuditRetention, writeAuditLog } from "@/lib/audit-log";

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

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
    const { searchParams } = new URL(req.url);
    const parsedPage = parseInt(searchParams.get("page") || "1", 10);
    const parsedLimit = parseInt(searchParams.get("limit") || "20", 10);
    const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const rawLimit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 20;
    const limit = Math.min(100, rawLimit);
    const skip = (page - 1) * limit;
    const search = (searchParams.get("search") || "").trim();

    const where: any = {
      companyId,
      role: "EMPLOYEE",
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json({ error: "Wystapil blad" }, { status: 500 });
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
    const body = await req.json();

    const name = normalizeString(body?.name);
    const email = normalizeString(body?.email).toLowerCase();
    const password = normalizeString(body?.password);

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Nazwa, email i haslo sa wymagane" },
        { status: 400 }
      );
    }

    const hashedPassword = await hash(password, 12);

    const createdUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: "EMPLOYEE",
          companyId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          companyId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      await enforceAuditRetention(tx, companyId);
      await writeAuditLog(tx, {
        companyId,
        ...actor,
        action: "CREATE",
        entityType: "USER",
        entityId: user.id,
        entityLabel: user.email,
        summary: `Created employee user ${user.email}`,
        changes: buildChanges(
          null,
          user as unknown as Record<string, unknown>,
          ["name", "email", "role", "companyId"]
        ),
      });

      return user;
    });

    return NextResponse.json(createdUser, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "Uzytkownik z tym emailem juz istnieje" }, { status: 409 });
    }
    console.error("Create user error:", error);
    return NextResponse.json({ error: "Wystapil blad" }, { status: 500 });
  }
}
