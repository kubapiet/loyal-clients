import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { hash } from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildAuditActor, buildChanges, enforceAuditRetention, writeAuditLog } from "@/lib/audit-log";

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const sessionUserId = (session.user as any).id;
    if (params.id === sessionUserId) {
      return NextResponse.json({ error: "Nie mozna edytowac wlasnego konta" }, { status: 400 });
    }

    const companyId = (session.user as any).companyId;
    const actor = buildAuditActor(session.user as any);
    const body = await req.json();

    const name = normalizeString(body?.name);
    const email = normalizeString(body?.email).toLowerCase();
    const password = normalizeString(body?.password);

    if (!name || !email) {
      return NextResponse.json({ error: "Nazwa i email sa wymagane" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyId: true,
      },
    });

    if (!existing || existing.companyId !== companyId || existing.role !== "EMPLOYEE") {
      return NextResponse.json({ error: "Uzytkownik nie znaleziony" }, { status: 404 });
    }

    const passwordHash = password ? await hash(password, 12) : null;

    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: params.id },
        data: {
          name,
          email,
          ...(passwordHash ? { password: passwordHash } : {}),
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
        action: "UPDATE",
        entityType: "USER",
        entityId: user.id,
        entityLabel: user.email,
        summary: `Updated employee user ${user.email}`,
        changes: buildChanges(
          existing as unknown as Record<string, unknown>,
          user as unknown as Record<string, unknown>,
          ["name", "email", "role", "companyId"]
        ),
      });

      return user;
    });

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "Uzytkownik z tym emailem juz istnieje" }, { status: 409 });
    }
    console.error("Update user error:", error);
    return NextResponse.json({ error: "Wystapil blad" }, { status: 500 });
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

    const role = (session.user as any).role;
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const sessionUserId = (session.user as any).id;
    if (params.id === sessionUserId) {
      return NextResponse.json({ error: "Nie mozna usunac wlasnego konta" }, { status: 400 });
    }

    const companyId = (session.user as any).companyId;
    const actor = buildAuditActor(session.user as any);

    const existing = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyId: true,
      },
    });

    if (!existing || existing.companyId !== companyId || existing.role !== "EMPLOYEE") {
      return NextResponse.json({ error: "Uzytkownik nie znaleziony" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.delete({ where: { id: params.id } });

      await enforceAuditRetention(tx, companyId);
      await writeAuditLog(tx, {
        companyId,
        ...actor,
        action: "DELETE",
        entityType: "USER",
        entityId: existing.id,
        entityLabel: existing.email,
        summary: `Deleted employee user ${existing.email}`,
        changes: buildChanges(
          existing as unknown as Record<string, unknown>,
          null,
          ["name", "email", "role", "companyId"]
        ),
      });
    });

    return NextResponse.json({ message: "Uzytkownik usuniety" });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json({ error: "Wystapil blad" }, { status: 500 });
  }
}
