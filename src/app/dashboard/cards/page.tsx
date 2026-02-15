"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Search, Loader2, Download } from "lucide-react";
import { useLocale } from "@/components/providers";
import { t } from "@/lib/i18n";
import { formatPoints } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function CardsPage() {
  const { locale } = useLocale();
  const router = useRouter();
  const { toast } = useToast();
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const fetchCards = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cards?search=${encodeURIComponent(search)}&page=${page}&limit=10`);
      const data = await res.json();
      setCards(data.cards || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch {
      toast({ title: t("common.error", locale), variant: "destructive" });
    }
    setLoading(false);
  }, [search, page, locale, toast]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  async function handleAddCard(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormLoading(true);
    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.get("firstName"),
          lastName: formData.get("lastName"),
          email: formData.get("email"),
          phone: formData.get("phone"),
        }),
      });

      if (res.ok) {
        toast({ title: t("common.success", locale) });
        setDialogOpen(false);
        fetchCards();
      } else {
        const data = await res.json();
        toast({ title: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: t("common.error", locale), variant: "destructive" });
    }
    setFormLoading(false);
  }

  async function handleExportCSV() {
    window.open("/api/export/cards", "_blank");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">{t("cards.title", locale)}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            {t("common.export_csv", locale)}
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {t("cards.add", locale)}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("cards.add", locale)}</DialogTitle>
                <DialogDescription>
                  {locale === "pl" ? "Dodaj nową kartę klienta" : "Add a new customer card"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddCard}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">{t("cards.first_name", locale)} *</Label>
                    <Input id="firstName" name="firstName" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">{t("cards.last_name", locale)} *</Label>
                    <Input id="lastName" name="lastName" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t("cards.email", locale)} *</Label>
                    <Input id="email" name="email" type="email" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t("cards.phone", locale)}</Label>
                    <Input id="phone" name="phone" type="tel" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    {t("common.cancel", locale)}
                  </Button>
                  <Button type="submit" disabled={formLoading}>
                    {formLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t("common.save", locale)}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-10"
          placeholder={t("cards.search", locale)}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : cards.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">{t("cards.no_cards", locale)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("cards.last_name", locale)}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t("cards.email", locale)}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("cards.phone", locale)}</TableHead>
                  <TableHead className="text-right">{t("cards.points", locale)}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cards.map((card) => (
                  <TableRow
                    key={card.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/dashboard/cards/${card.id}`)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{card.firstName} {card.lastName}</p>
                        <p className="text-xs text-muted-foreground">{card.cardNumber}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{card.email}</TableCell>
                    <TableCell className="hidden md:table-cell">{card.phone || "-"}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{formatPoints(card.totalPoints)} pkt</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
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
