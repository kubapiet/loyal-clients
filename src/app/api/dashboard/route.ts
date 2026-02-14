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

    const [
      totalCards,
      totalPointsResult,
      activePromotions,
      recentTransactions,
      topCustomers,
      transactionsByMonth,
    ] = await Promise.all([
      prisma.loyaltyCard.count({ where: { companyId } }),
      prisma.loyaltyCard.aggregate({
        where: { companyId },
        _sum: { totalPoints: true },
      }),
      prisma.promotion.count({
        where: {
          companyId,
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
        },
      }),
      prisma.transaction.findMany({
        where: { loyaltyCard: { companyId } },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          loyaltyCard: {
            select: { firstName: true, lastName: true, cardNumber: true },
          },
        },
      }),
      prisma.loyaltyCard.findMany({
        where: { companyId },
        orderBy: { totalPoints: "desc" },
        take: 5,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          totalPoints: true,
          cardNumber: true,
        },
      }),
      prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('month', t."createdAt") as month,
          SUM(t."amount") as total_amount,
          COUNT(*) as count
        FROM "Transaction" t
        JOIN "LoyaltyCard" lc ON t."loyaltyCardId" = lc."id"
        WHERE lc."companyId" = ${companyId}
        AND t."createdAt" >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', t."createdAt")
        ORDER BY month ASC
      `,
    ]);

    return NextResponse.json({
      totalCards,
      totalPoints: totalPointsResult._sum.totalPoints || 0,
      activePromotions,
      recentTransactions,
      topCustomers,
      transactionsByMonth,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Wystąpił błąd" }, { status: 500 });
  }
}
