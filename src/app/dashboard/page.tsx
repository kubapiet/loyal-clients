"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreditCard, TrendingUp, Megaphone, Loader2 } from "lucide-react";
import { useLocale } from "@/components/providers";
import { t } from "@/lib/i18n";
import { formatCurrency, formatPoints } from "@/lib/utils";
import { format } from "date-fns";
import { pl, enUS } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DashboardData {
  totalCards: number;
  totalPoints: number;
  activePromotions: number;
  recentTransactions: any[];
  topCustomers: any[];
  transactionsByMonth: any[];
}

export default function DashboardPage() {
  const { locale } = useLocale();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-center text-muted-foreground">{t("common.error", locale)}</div>;
  }

  const chartData = (data.transactionsByMonth as any[])?.map((item: any) => ({
    month: format(new Date(item.month), "MMM yyyy", { locale: locale === "pl" ? pl : enUS }),
    amount: Number(item.total_amount) || 0,
    count: Number(item.count) || 0,
  })) || [];

  const typeLabels: Record<string, string> = {
    PURCHASE: t("transactions.purchase", locale),
    REFUND: t("transactions.refund", locale),
    MANUAL_ADD: t("transactions.manual_add", locale),
    MANUAL_SUBTRACT: t("transactions.manual_subtract", locale),
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t("dashboard.title", locale)}</h1>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("dashboard.total_cards", locale)}</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalCards}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("dashboard.total_points", locale)}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPoints(data.totalPoints)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("dashboard.active_promotions", locale)}</CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.activePromotions}</div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.transactions_chart", locale)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Customers */}
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.top_customers", locale)}</CardTitle>
          </CardHeader>
          <CardContent>
            {data.topCustomers.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t("common.no_data", locale)}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("cards.last_name", locale)}</TableHead>
                    <TableHead className="text-right">{t("cards.points", locale)}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topCustomers.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell>{c.firstName} {c.lastName}</TableCell>
                      <TableCell className="text-right font-medium">{formatPoints(c.totalPoints)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.recent_transactions", locale)}</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentTransactions.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t("common.no_data", locale)}</p>
            ) : (
              <div className="space-y-3">
                {data.recentTransactions.map((tx: any) => (
                  <div key={tx.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{tx.loyaltyCard.firstName} {tx.loyaltyCard.lastName}</p>
                      <p className="text-muted-foreground text-xs">
                        {format(new Date(tx.createdAt), "dd.MM.yyyy HH:mm")}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={tx.points >= 0 ? "default" : "destructive"}>
                        {tx.points >= 0 ? "+" : ""}{tx.points} pkt
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">{typeLabels[tx.type]}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
