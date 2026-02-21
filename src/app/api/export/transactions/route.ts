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

    const transactions = await prisma.transaction.findMany({
      where: { loyaltyCard: { companyId } },
      orderBy: { createdAt: "desc" },
      include: {
        loyaltyCard: {
          select: { firstName: true, lastName: true, cardNumber: true },
        },
      },
    });

    const csvHeader = "Data,Numer karty,Klient,Kwota (PLN),Punkty,Typ,Opis\n";
    const typeMap: Record<string, string> = {
      PURCHASE: "Zakup",
      REFUND: "Zwrot",
      MANUAL_ADD: "Dodanie ręczne",
      MANUAL_SUBTRACT: "Odjęcie ręczne",
    };
    const csvRows = transactions.map((t) =>
      [
        t.createdAt.toISOString().split("T")[0],
        t.loyaltyCard.cardNumber,
        `${t.loyaltyCard.firstName} ${t.loyaltyCard.lastName}`,
        t.amount,
        t.points,
        typeMap[t.type] || t.type,
        t.description || "",
      ].join(",")
    ).join("\n");

    const csv = csvHeader + csvRows;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="transakcje-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Wystąpił błąd" }, { status: 500 });
  }
}
