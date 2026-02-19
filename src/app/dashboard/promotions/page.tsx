"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Loader2, Trash2, Pencil } from "lucide-react";
import { useLocale } from "@/components/providers";
import { t } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { format, isAfter, isBefore } from "date-fns";

export default function PromotionsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { locale } = useLocale();
  const { toast } = useToast();
  const [promotions, setPromotions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [editingPromo, setEditingPromo] = useState<any>(null);
  const role = (session?.user as any)?.role;
  const hasAdminAccess = role === "ADMIN";

  useEffect(() => {
    if (status === "loading") return;
    if (!hasAdminAccess) {
      toast({
        title: locale === "pl" ? "Brak dostepu do promocji" : "No access to promotions",
        variant: "destructive",
      });
      router.replace("/dashboard");
    }
  }, [hasAdminAccess, locale, router, status, toast]);

  async function fetchPromotions() {
    if (status !== "authenticated" || !hasAdminAccess) return;
    try {
      const res = await fetch("/api/promotions");
      const data = await res.json();
      setPromotions(data);
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    fetchPromotions();
  }, [status, hasAdminAccess]);

  const now = new Date();
  const activePromotions = promotions.filter(
    (p) => !isBefore(new Date(p.endDate), now) && !isAfter(new Date(p.startDate), now)
  );
  const archivedPromotions = promotions.filter(
    (p) => isBefore(new Date(p.endDate), now) || isAfter(new Date(p.startDate), now)
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormLoading(true);
    const formData = new FormData(e.currentTarget);

    const body = {
      title: formData.get("title"),
      description: formData.get("description"),
      startDate: formData.get("startDate"),
      endDate: formData.get("endDate"),
      couponCode: formData.get("couponCode"),
    };

    try {
      const url = editingPromo ? `/api/promotions/${editingPromo.id}` : "/api/promotions";
      const method = editingPromo ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast({ title: t("common.success", locale) });
        setDialogOpen(false);
        setEditingPromo(null);
        fetchPromotions();
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
      const res = await fetch(`/api/promotions/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: t("common.success", locale) });
        fetchPromotions();
      }
    } catch {
      toast({ title: t("common.error", locale), variant: "destructive" });
    }
  }

  function PromotionCard({ promo }: { promo: any }) {
    const isActive = !isBefore(new Date(promo.endDate), now) && !isAfter(new Date(promo.startDate), now);
    return (
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{promo.title}</CardTitle>
              <CardDescription>
                {format(new Date(promo.startDate), "dd.MM.yyyy")} - {format(new Date(promo.endDate), "dd.MM.yyyy")}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isActive ? "default" : "secondary"}>
                {isActive ? t("promotions.active", locale) : t("promotions.archived", locale)}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">{promo.description}</p>
          {promo.couponCode && (
            <p className="text-sm">
              <span className="text-muted-foreground">{t("promotions.coupon_code", locale)}:</span>{" "}
              <code className="bg-muted px-2 py-1 rounded font-mono">{promo.couponCode}</code>
            </p>
          )}
          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => { setEditingPromo(promo); setDialogOpen(true); }}>
              <Pencil className="mr-2 h-3 w-3" />{t("common.edit", locale)}
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleDelete(promo.id)}>
              <Trash2 className="mr-2 h-3 w-3 text-destructive" />{t("common.delete", locale)}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === "loading" || !hasAdminAccess) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("promotions.title", locale)}</h1>
        <Button onClick={() => { setEditingPromo(null); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          {t("promotions.add", locale)}
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingPromo(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPromo ? t("common.edit", locale) : t("promotions.add", locale)}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">{t("promotions.title_field", locale)} *</Label>
                <Input id="title" name="title" required defaultValue={editingPromo?.title || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">{t("promotions.description", locale)} *</Label>
                <Textarea id="description" name="description" required defaultValue={editingPromo?.description || ""} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">{t("promotions.start_date", locale)} *</Label>
                  <Input id="startDate" name="startDate" type="date" required defaultValue={editingPromo ? format(new Date(editingPromo.startDate), "yyyy-MM-dd") : ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">{t("promotions.end_date", locale)} *</Label>
                  <Input id="endDate" name="endDate" type="date" required defaultValue={editingPromo ? format(new Date(editingPromo.endDate), "yyyy-MM-dd") : ""} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="couponCode">{t("promotions.coupon_code", locale)}</Label>
                <Input id="couponCode" name="couponCode" defaultValue={editingPromo?.couponCode || ""} />
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

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">{t("promotions.active", locale)} ({activePromotions.length})</TabsTrigger>
            <TabsTrigger value="archived">{t("promotions.archived", locale)} ({archivedPromotions.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="active" className="space-y-4 mt-4">
            {activePromotions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">{t("promotions.no_promotions", locale)}</p>
            ) : (
              activePromotions.map((p) => <PromotionCard key={p.id} promo={p} />)
            )}
          </TabsContent>
          <TabsContent value="archived" className="space-y-4 mt-4">
            {archivedPromotions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">{t("promotions.no_promotions", locale)}</p>
            ) : (
              archivedPromotions.map((p) => <PromotionCard key={p.id} promo={p} />)
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
