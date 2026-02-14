"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Download } from "lucide-react";
import { useLocale } from "@/components/providers";
import { t } from "@/lib/i18n";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

export default function TransactionsPage() {
  const { locale } = useLocale();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/transactions?page=${page}&limit=20`);
      const data = await res.json();
      setTransactions(data.transactions || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch {}
    setLoading(false);
  }, [page]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const typeLabels: Record<string, string> = {
    PURCHASE: t("transactions.purchase", locale),
    REFUND: t("transactions.refund", locale),
    MANUAL_ADD: t("transactions.manual_add", locale),
    MANUAL_SUBTRACT: t("transactions.manual_subtract", locale),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("transactions.title", locale)}</h1>
        <Button variant="outline" onClick={() => window.open("/api/export/transactions", "_blank")}>
          <Download className="mr-2 h-4 w-4" />
          {t("common.export_csv", locale)}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">{t("transactions.no_transactions", locale)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("transactions.date", locale)}</TableHead>
                  <TableHead>{locale === "pl" ? "Klient" : "Customer"}</TableHead>
                  <TableHead>{t("transactions.type", locale)}</TableHead>
                  <TableHead className="text-right">{t("transactions.amount", locale)}</TableHead>
                  <TableHead className="text-right">{t("transactions.points", locale)}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>{format(new Date(tx.createdAt), "dd.MM.yyyy HH:mm")}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{tx.loyaltyCard?.firstName} {tx.loyaltyCard?.lastName}</p>
                        <p className="text-xs text-muted-foreground">{tx.loyaltyCard?.cardNumber}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={tx.type === "REFUND" || tx.type === "MANUAL_SUBTRACT" ? "destructive" : "default"}>
                        {typeLabels[tx.type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(tx.amount)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {tx.points >= 0 ? "+" : ""}{tx.points}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            {t("common.previous", locale)}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t("common.page", locale)} {page} {t("common.of", locale)} {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            {t("common.next", locale)}
          </Button>
        </div>
      )}
    </div>
  );
}
