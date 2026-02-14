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

    const cards = await prisma.loyaltyCard.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { transactions: true } },
      },
    });

    const csvHeader = "Numer karty,Imię,Nazwisko,Email,Telefon,Punkty,Liczba transakcji,Data utworzenia\n";
    const csvRows = cards.map((card) =>
      [
        card.cardNumber,
        card.firstName,
        card.lastName,
        card.email,
        card.phone || "",
        card.totalPoints,
        card._count.transactions,
        card.createdAt.toISOString().split("T")[0],
      ].join(",")
    ).join("\n");

    const csv = csvHeader + csvRows;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="karty-klientow-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Wystąpił błąd" }, { status: 500 });
  }
}
