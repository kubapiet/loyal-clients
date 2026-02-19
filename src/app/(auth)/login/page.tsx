"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/components/providers";
import { t } from "@/lib/i18n";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { locale } = useLocale();
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  async function handleCompanyLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);

    const result = await signIn("company-login", {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      toast({ title: "Błąd logowania", description: "Nieprawidłowy email lub hasło", variant: "destructive" });
    } else {
      router.push("/dashboard");
    }
  }

  async function handleMagicLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.get("customer-email") as string,
          cardNumber: formData.get("card-number") as string,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMagicLinkSent(true);
        toast({ title: "Link wysłany", description: "Sprawdź swoją skrzynkę email" });

        // In development, auto-login with the debug token
        if (data.debugToken) {
          const loginResult = await signIn("magic-link", {
            token: data.debugToken,
            redirect: false,
          });
          if (!loginResult?.error) {
            router.push("/customer");
          }
        }
      } else {
        toast({ title: "Błąd", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Błąd", description: "Wystąpił błąd podczas wysyłania linku", variant: "destructive" });
    }

    setLoading(false);
  }

  async function handleEmployeeLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);

    const result = await signIn("employee-login", {
      email: formData.get("employee-email") as string,
      password: formData.get("employee-password") as string,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      toast({ title: "Blad logowania", description: "Nieprawidlowy email lub haslo", variant: "destructive" });
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <CreditCard className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">LoyaltyApp</h1>
        </div>

        <Tabs defaultValue="company" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="company">Firma / Sklep</TabsTrigger>
            <TabsTrigger value="employee">{t("auth.employee_panel", locale)}</TabsTrigger>
            <TabsTrigger value="customer">Klient</TabsTrigger>
          </TabsList>

          <TabsContent value="company">
            <Card>
              <CardHeader>
                <CardTitle>Panel firmy</CardTitle>
                <CardDescription>Zaloguj się do panelu zarządzania</CardDescription>
              </CardHeader>
              <form onSubmit={handleCompanyLogin}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" placeholder="firma@example.com" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Hasło</Label>
                    <Input id="password" name="password" type="password" required />
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Zaloguj się
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Nie masz konta?{" "}
                    <Link href="/register" className="text-primary hover:underline">
                      Zarejestruj się
                    </Link>
                  </p>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="employee">
            <Card>
              <CardHeader>
                <CardTitle>{t("auth.employee_panel", locale)}</CardTitle>
                <CardDescription>
                  {locale === "pl" ? "Logowanie dla kont pracownikow i adminow" : "Login for employee and admin users"}
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleEmployeeLogin}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="employee-email">Email</Label>
                    <Input id="employee-email" name="employee-email" type="email" placeholder="test@test.com" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="employee-password">Haslo</Label>
                    <Input id="employee-password" name="employee-password" type="password" required />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t("auth.login", locale)}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="customer">
            <Card>
              <CardHeader>
                <CardTitle>Portal klienta</CardTitle>
                <CardDescription>
                  {magicLinkSent
                    ? "Link logowania został wysłany na Twój email"
                    : "Podaj email lub numer karty aby otrzymać link logowania"}
                </CardDescription>
              </CardHeader>
              {!magicLinkSent && (
                <form onSubmit={handleMagicLink}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="customer-email">Email</Label>
                      <Input id="customer-email" name="customer-email" type="email" placeholder="klient@example.com" />
                    </div>
                    <div className="text-center text-sm text-muted-foreground">lub</div>
                    <div className="space-y-2">
                      <Label htmlFor="card-number">Numer karty</Label>
                      <Input id="card-number" name="card-number" placeholder="LC-XXXXXX-XXXX" />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Wyślij link logowania
                    </Button>
                  </CardFooter>
                </form>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
