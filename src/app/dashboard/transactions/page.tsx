"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Download, Plus, Search, Trash2 } from "lucide-react";
import { useLocale } from "@/components/providers";
import { t } from "@/lib/i18n";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function TransactionsPage() {
  const { locale } = useLocale();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [cardSearch, setCardSearch] = useState("");
  const [cardResults, setCardResults] = useState<any[]>([]);
  const [cardSearchLoading, setCardSearchLoading] = useState(false);
  const [selectedCard, setSelectedCard] = useState<any>(null);

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

  // Debounced card search
  useEffect(() => {
    if (!dialogOpen) return;
    if (cardSearch.length < 2) {
      setCardResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setCardSearchLoading(true);
      try {
        const res = await fetch(`/api/cards?search=${encodeURIComponent(cardSearch)}&limit=5`);
        const data = await res.json();
        setCardResults(data.cards || []);
      } catch {}
      setCardSearchLoading(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [cardSearch, dialogOpen]);

  function openDialog() {
    setSelectedCard(null);
    setCardSearch("");
    setCardResults([]);
    setDialogOpen(true);
  }

  async function handleAddTransaction(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedCard) {
      toast({
        title: locale === "pl" ? "Wybierz klienta" : "Select a customer",
        variant: "destructive",
      });
      return;
    }
    setFormLoading(true);
    const formData = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loyaltyCardId: selectedCard.id,
          amount: parseFloat(formData.get("amount") as string),
          type: formData.get("type"),
          description: formData.get("description"),
        }),
      });
      if (res.ok) {
        toast({ title: t("common.success", locale) });
        setDialogOpen(false);
        fetchTransactions();
      } else {
        const data = await res.json();
        toast({ title: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: t("common.error", locale), variant: "destructive" });
    }
    setFormLoading(false);
  }

  async function handleDeleteTransaction(id: string) {
    if (!confirm(t("common.confirm_delete", locale))) return;
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: t("common.success", locale) });
        fetchTransactions();
      } else {
        const data = await res.json();
        toast({ title: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: t("common.error", locale), variant: "destructive" });
    }
  }

  const typeLabels: Record<string, string> = {
    PURCHASE: t("transactions.purchase", locale),
    REFUND: t("transactions.refund", locale),
    MANUAL_ADD: t("transactions.manual_add", locale),
    MANUAL_SUBTRACT: t("transactions.manual_subtract", locale),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">{t("transactions.title", locale)}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.open("/api/export/transactions", "_blank")}>
            <Download className="mr-2 h-4 w-4" />
            {t("common.export_csv", locale)}
          </Button>
          <Button onClick={openDialog}>
            <Plus className="mr-2 h-4 w-4" />
            {t("transactions.add", locale)}
          </Button>
        </div>
      </div>

      {/* Add Transaction Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("transactions.add", locale)}</DialogTitle>
            <DialogDescription>
              {locale === "pl"
                ? "Wyszukaj klienta i dodaj transakcję"
                : "Search for a customer and add a transaction"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddTransaction}>
            <div className="space-y-4 py-4">
              {/* Card selection */}
              <div className="space-y-2">
                <Label>{locale === "pl" ? "Klient" : "Customer"} *</Label>
                {selectedCard ? (
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="font-medium">
                        {selectedCard.firstName} {selectedCard.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{selectedCard.cardNumber}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedCard(null);
                        setCardSearch("");
                      }}
                    >
                      {locale === "pl" ? "Zmień" : "Change"}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        className="pl-10"
                        placeholder={
                          locale === "pl"
                            ? "Szukaj po nazwisku, emailu lub numerze karty..."
                            : "Search by name, email or card number..."
                        }
                        value={cardSearch}
                        onChange={(e) => setCardSearch(e.target.value)}
                        autoFocus
                      />
                    </div>
                    {cardSearchLoading && (
                      <div className="flex justify-center py-2">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    {cardResults.length > 0 && (
                      <div className="rounded-md border divide-y max-h-48 overflow-y-auto">
                        {cardResults.map((card) => (
                          <button
                            key={card.id}
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-accent transition-colors"
                            onClick={() => {
                              setSelectedCard(card);
                              setCardSearch("");
                              setCardResults([]);
                            }}
                          >
                            <p className="text-sm font-medium">
                              {card.firstName} {card.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {card.cardNumber} &middot; {card.email}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                    {cardSearch.length >= 2 && !cardSearchLoading && cardResults.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        {locale === "pl" ? "Nie znaleziono klientów" : "No customers found"}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Transaction type */}
              <div className="space-y-2">
                <Label htmlFor="tx-type">{t("transactions.type", locale)}</Label>
                <select
                  id="tx-type"
                  name="type"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required
                >
                  <option value="PURCHASE">{t("transactions.purchase", locale)}</option>
                  <option value="REFUND">{t("transactions.refund", locale)}</option>
                  <option value="MANUAL_ADD">{t("transactions.manual_add", locale)}</option>
                  <option value="MANUAL_SUBTRACT">{t("transactions.manual_subtract", locale)}</option>
                </select>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="tx-amount">{t("transactions.amount", locale)}</Label>
                <Input id="tx-amount" name="amount" type="number" step="0.01" min="0.01" required />
                <p className="text-xs text-muted-foreground">
                  1 PLN = 1 {locale === "pl" ? "punkt" : "point"}
                </p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="tx-desc">{t("transactions.description", locale)}</Label>
                <Input id="tx-desc" name="description" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {t("common.cancel", locale)}
              </Button>
              <Button type="submit" disabled={formLoading || !selectedCard}>
                {formLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("common.save", locale)}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
                  <TableHead className="text-right w-[60px]"></TableHead>
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
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTransaction(tx.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
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
