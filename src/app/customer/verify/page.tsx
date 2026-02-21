"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }

    signIn("magic-link", {
      token,
      redirect: false,
    }).then((result) => {
      if (result?.error) {
        setStatus("error");
      } else {
        setStatus("success");
        setTimeout(() => router.push("/customer"), 1500);
      }
    });
  }, [token, router]);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <CreditCard className="h-10 w-10 text-primary" />
        </div>
        <CardTitle>Weryfikacja logowania</CardTitle>
      </CardHeader>
      <CardContent className="text-center">
        {status === "loading" && (
          <div className="space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Weryfikacja linku...</p>
          </div>
        )}
        {status === "success" && (
          <div className="space-y-4">
            <CheckCircle className="h-8 w-8 mx-auto text-green-500" />
            <p className="text-green-600 font-medium">Zalogowano pomyślnie!</p>
            <p className="text-sm text-muted-foreground">Przekierowanie...</p>
          </div>
        )}
        {status === "error" && (
          <div className="space-y-4">
            <XCircle className="h-8 w-8 mx-auto text-destructive" />
            <p className="text-destructive font-medium">Link jest nieprawidłowy lub wygasł</p>
            <Link href="/login">
              <Button>Wróć do logowania</Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function VerifyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Suspense
        fallback={
          <Card className="w-full max-w-sm">
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
          </Card>
        }
      >
        <VerifyContent />
      </Suspense>
    </div>
  );
}
