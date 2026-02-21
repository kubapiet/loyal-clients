"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreditCard, LogOut, Loader2, Gift, TrendingUp } from "lucide-react";
import { formatCurrency, formatPoints, getDiscountForPoints, getNextTier, getProgressToNextTier } from "@/lib/utils";
import { format } from "date-fns";

export default function CustomerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [cardData, setCardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated" && (session?.user as any)?.cardId) {
      fetch(`/api/customer/${(session.user as any).cardId}`)
        .then((res) => res.json())
        .then((data) => {
          setCardData(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [session, status, router]);

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!cardData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Nie znaleziono danych karty</p>
      </div>
    );
  }

  const tiers = cardData.company?.discountTiers || [];
  const currentDiscount = getDiscountForPoints(cardData.totalPoints, tiers);
  const nextTier = getNextTier(cardData.totalPoints, tiers);
  const progress = getProgressToNextTier(cardData.totalPoints, tiers);
  const activePromotions = cardData.company?.promotions || [];

  const typeLabels: Record<string, string> = {
    PURCHASE: "Zakup",
    REFUND: "Zwrot",
    MANUAL_ADD: "Bonus",
    MANUAL_SUBTRACT: "Korekta",
  };

  return (
    <div className="max-w-2xl mx-auto p-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CreditCard className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">{cardData.company?.name}</h1>
            <p className="text-sm text-muted-foreground">Karta: {cardData.cardNumber}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => signOut({ callbackUrl: "/login" })}>
          <LogOut className="h-5 w-5" />
        </Button>
      </div>

      {/* Points & Discount */}
      <div className="grid gap-4 grid-cols-2">
        <Card>
          <CardContent className="pt-6 text-center">
            <TrendingUp className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-4xl font-bold text-primary">{formatPoints(cardData.totalPoints)}</p>
            <p className="text-sm text-muted-foreground mt-1">Twoje punkty</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Gift className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-4xl font-bold text-primary">{currentDiscount}%</p>
            <p className="text-sm text-muted-foreground mt-1">Twój rabat</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress to next tier */}
      {nextTier && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Do następnego progu{nextTier.label ? ` (${nextTier.label})` : ""}</p>
              <p className="text-sm text-muted-foreground">{nextTier.discountPercent}% rabatu</p>
            </div>
            <Progress value={progress} className="h-3" />
            <p className="text-xs text-muted-foreground mt-2">
              {formatPoints(cardData.totalPoints)} / {formatPoints(nextTier.minPoints)} punktów
            </p>
          </CardContent>
        </Card>
      )}

      {/* QR Code */}
      {cardData.qrCode && (
        <Card>
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-lg">Twoja karta</CardTitle>
            <CardDescription>Pokaż kod w sklepie</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <img src={cardData.qrCode} alt="QR Code" className="w-48 h-48" />
            <p className="font-mono text-lg font-bold mt-2">{cardData.cardNumber}</p>
          </CardContent>
        </Card>
      )}

      {/* Active Promotions */}
      {activePromotions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Aktualne promocje</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activePromotions.map((promo: any) => (
              <div key={promo.id} className="border rounded-lg p-4">
                <h3 className="font-semibold">{promo.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{promo.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary">
                    do {format(new Date(promo.endDate), "dd.MM.yyyy")}
                  </Badge>
                  {promo.couponCode && (
                    <Badge variant="outline">
                      Kod: {promo.couponCode}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Historia transakcji</CardTitle>
        </CardHeader>
        <CardContent>
          {!cardData.transactions || cardData.transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Brak transakcji</p>
          ) : (
            <div className="space-y-3">
              {cardData.transactions.map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{typeLabels[tx.type] || tx.type}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(tx.createdAt), "dd.MM.yyyy HH:mm")}
                    </p>
                    {tx.description && (
                      <p className="text-xs text-muted-foreground">{tx.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatCurrency(tx.amount)}</p>
                    <Badge variant={tx.points >= 0 ? "default" : "destructive"} className="text-xs">
                      {tx.points >= 0 ? "+" : ""}{tx.points} pkt
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
