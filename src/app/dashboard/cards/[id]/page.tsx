"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Plus, Loader2, QrCode, Trash2, Award } from "lucide-react";
import { useLocale } from "@/components/providers";
import { t } from "@/lib/i18n";
import { formatCurrency, formatPoints } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import Link from "next/link";

export default function CardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { locale } = useLocale();
  const { toast } = useToast();
  const [card, setCard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qrCode, setQrCode] = useState<string>("");
  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [txLoading, setTxLoading] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);

  async function fetchCard() {
    try {
      const res = await fetch(`/api/cards/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setCard(data);
      }
    } catch {}
    setLoading(false);
  }

  async function fetchQR() {
    try {
      const res = await fetch(`/api/cards/${params.id}/qrcode`);
      if (res.ok) {
        const data = await res.json();
        setQrCode(data.qrCode);
      }
    } catch {}
  }

  useEffect(() => {
    fetchCard();
    fetchQR();
  }, [params.id]);

  async function handleAddTransaction(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTxLoading(true);
    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loyaltyCardId: params.id,
          amount: parseFloat(formData.get("amount") as string),
          type: formData.get("type"),
          description: formData.get("description"),
        }),
      });

      if (res.ok) {
        toast({ title: t("common.success", locale) });
        setTxDialogOpen(false);
        fetchCard();
      } else {
        const data = await res.json();
        toast({ title: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: t("common.error", locale), variant: "destructive" });
    }
    setTxLoading(false);
  }

  async function handleDeleteTransaction(txId: string) {
    if (!confirm(t("common.confirm_delete", locale))) return;
    try {
      const res = await fetch(`/api/transactions/${txId}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: t("common.success", locale) });
        fetchCard();
      } else {
        const data = await res.json();
        toast({ title: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: t("common.error", locale), variant: "destructive" });
    }
  }

  async function handleDelete() {
    if (!confirm(t("common.confirm_delete", locale))) return;
    try {
      const res = await fetch(`/api/cards/${params.id}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: t("common.success", locale) });
        router.push("/dashboard/cards");
      }
    } catch {
      toast({ title: t("common.error", locale), variant: "destructive" });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!card) {
    return <div className="text-center text-muted-foreground">Karta nie znaleziona</div>;
  }

  const typeLabels: Record<string, string> = {
    PURCHASE: t("transactions.purchase", locale),
    REFUND: t("transactions.refund", locale),
    MANUAL_ADD: t("transactions.manual_add", locale),
    MANUAL_SUBTRACT: t("transactions.manual_subtract", locale),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/cards">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h1 className="text-3xl font-bold">{card.firstName} {card.lastName}</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Card Info */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{locale === "pl" ? "Dane karty" : "Card Details"}</CardTitle>
            <div className="flex gap-2">
              <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm"><QrCode className="mr-2 h-4 w-4" />QR</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>QR / {locale === "pl" ? "Kod kreskowy" : "Barcode"}</DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col items-center gap-4 py-4">
                    {qrCode && <img src={qrCode} alt="QR Code" className="w-64 h-64" />}
                    <p className="text-lg font-mono font-bold">{card.cardNumber}</p>
                    <svg id={`barcode-${card.id}`} className="w-full max-w-xs" />
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4" />{t("common.delete", locale)}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">{t("cards.first_name", locale)}</p>
                <p className="font-medium">{card.firstName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("cards.last_name", locale)}</p>
                <p className="font-medium">{card.lastName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("cards.email", locale)}</p>
                <p className="font-medium">{card.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("cards.phone", locale)}</p>
                <p className="font-medium">{card.phone || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{locale === "pl" ? "Numer karty" : "Card Number"}</p>
                <p className="font-mono font-medium">{card.cardNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("cards.created", locale)}</p>
                <p className="font-medium">{format(new Date(card.createdAt), "dd.MM.yyyy")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Points & Discount Tier */}
        <Card>
          <CardHeader>
            <CardTitle>{t("cards.points", locale)}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <p className="text-5xl font-bold text-primary">{formatPoints(card.totalPoints)}</p>
            <p className="text-muted-foreground">{locale === "pl" ? "punktów" : "points"}</p>

            <Separator />

            <div className="w-full space-y-3">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                <p className="text-sm font-medium">
                  {locale === "pl" ? "Próg rabatowy" : "Discount tier"}
                </p>
              </div>
              {card.discountTier ? (
                <div className="rounded-md border bg-primary/5 p-3 text-center">
                  <p className="text-lg font-bold text-primary">
                    -{card.discountTier.discountPercent}%
                  </p>
                  {card.discountTier.label && (
                    <p className="text-sm text-muted-foreground">{card.discountTier.label}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {locale === "pl" ? "od" : "from"} {formatPoints(card.discountTier.minPoints)} pkt
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center">
                  {locale === "pl" ? "Brak przysługującego progu" : "No tier reached yet"}
                </p>
              )}
              {card.nextDiscountTier && (
                <p className="text-xs text-muted-foreground text-center">
                  {locale === "pl" ? "Następny próg" : "Next tier"}: <span className="font-medium">-{card.nextDiscountTier.discountPercent}%</span>
                  {" "}({locale === "pl" ? "brakuje" : "need"} {formatPoints(card.nextDiscountTier.minPoints - card.totalPoints)} pkt)
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t("transactions.title", locale)}</CardTitle>
          <Dialog open={txDialogOpen} onOpenChange={setTxDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-2 h-4 w-4" />{t("transactions.add", locale)}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("transactions.add", locale)}</DialogTitle>
                <DialogDescription>
                  {locale === "pl" ? "Dodaj nową transakcję dla tego klienta" : "Add a new transaction for this customer"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddTransaction}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">{t("transactions.type", locale)}</Label>
                    <select
                      id="type"
                      name="type"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      required
                    >
                      <option value="PURCHASE">{t("transactions.purchase", locale)}</option>
                      <option value="REFUND">{t("transactions.refund", locale)}</option>
                      <option value="MANUAL_ADD">{t("transactions.manual_add", locale)}</option>
                      <option value="MANUAL_SUBTRACT">{t("transactions.manual_subtract", locale)}</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">{t("transactions.amount", locale)}</Label>
                    <Input id="amount" name="amount" type="number" step="0.01" min="0.01" required />
                    <p className="text-xs text-muted-foreground">1 PLN = 1 {locale === "pl" ? "punkt" : "point"}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">{t("transactions.description", locale)}</Label>
                    <Input id="description" name="description" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setTxDialogOpen(false)}>
                    {t("common.cancel", locale)}
                  </Button>
                  <Button type="submit" disabled={txLoading}>
                    {txLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t("common.save", locale)}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {!card.transactions || card.transactions.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">{t("transactions.no_transactions", locale)}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("transactions.date", locale)}</TableHead>
                  <TableHead>{t("transactions.type", locale)}</TableHead>
                  <TableHead className="text-right">{t("transactions.amount", locale)}</TableHead>
                  <TableHead className="text-right">{t("transactions.points", locale)}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t("transactions.description", locale)}</TableHead>
                  <TableHead className="text-right w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {card.transactions.map((tx: any) => (
                  <TableRow key={tx.id}>
                    <TableCell>{format(new Date(tx.createdAt), "dd.MM.yyyy HH:mm")}</TableCell>
                    <TableCell>
                      <Badge variant={tx.type === "REFUND" || tx.type === "MANUAL_SUBTRACT" ? "destructive" : "default"}>
                        {typeLabels[tx.type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(tx.amount)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {tx.points >= 0 ? "+" : ""}{tx.points}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">{tx.description || "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteTransaction(tx.id)}>
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
    </div>
  );
}
