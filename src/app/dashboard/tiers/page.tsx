"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Loader2, Trash2, Pencil } from "lucide-react";
import { useLocale } from "@/components/providers";
import { t } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";

export default function TiersPage() {
  const { locale } = useLocale();
  const { toast } = useToast();
  const [tiers, setTiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [editingTier, setEditingTier] = useState<any>(null);

  async function fetchTiers() {
    try {
      const res = await fetch("/api/tiers");
      const data = await res.json();
      setTiers(data);
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    fetchTiers();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormLoading(true);
    const formData = new FormData(e.currentTarget);

    const body = {
      minPoints: parseInt(formData.get("minPoints") as string),
      discountPercent: parseFloat(formData.get("discountPercent") as string),
      label: formData.get("label") as string,
    };

    try {
      const url = editingTier ? `/api/tiers/${editingTier.id}` : "/api/tiers";
      const method = editingTier ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast({ title: t("common.success", locale) });
        setDialogOpen(false);
        setEditingTier(null);
        fetchTiers();
      } else {
        const data = await res.json();
        toast({ title: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: t("common.error", locale), variant: "destructive" });
    }
    setFormLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm(t("common.confirm_delete", locale))) return;
    try {
      const res = await fetch(`/api/tiers/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: t("common.success", locale) });
        fetchTiers();
      }
    } catch {
      toast({ title: t("common.error", locale), variant: "destructive" });
    }
  }

  function openEdit(tier: any) {
    setEditingTier(tier);
    setDialogOpen(true);
  }

  function openNew() {
    setEditingTier(null);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("tiers.title", locale)}</h1>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" />
          {t("tiers.add", locale)}
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingTier(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTier ? t("common.edit", locale) : t("tiers.add", locale)}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="minPoints">{t("tiers.min_points", locale)} *</Label>
                <Input id="minPoints" name="minPoints" type="number" min="0" required defaultValue={editingTier?.minPoints || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discountPercent">{t("tiers.discount_percent", locale)} *</Label>
                <Input id="discountPercent" name="discountPercent" type="number" min="0" max="100" step="0.1" required defaultValue={editingTier?.discountPercent || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="label">{t("tiers.label", locale)}</Label>
                <Input id="label" name="label" placeholder={locale === "pl" ? "np. Srebrny, Złoty" : "e.g. Silver, Gold"} defaultValue={editingTier?.label || ""} />
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

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : tiers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">{t("tiers.no_tiers", locale)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("tiers.min_points", locale)}</TableHead>
                  <TableHead>{t("tiers.discount_percent", locale)}</TableHead>
                  <TableHead>{t("tiers.label", locale)}</TableHead>
                  <TableHead className="text-right">{locale === "pl" ? "Akcje" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tiers.map((tier) => (
                  <TableRow key={tier.id}>
                    <TableCell className="font-medium">{tier.minPoints} pkt</TableCell>
                    <TableCell>{tier.discountPercent}%</TableCell>
                    <TableCell>{tier.label || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(tier)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(tier.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
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
