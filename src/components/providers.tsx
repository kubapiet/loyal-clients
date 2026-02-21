"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { createContext, useContext, useState, ReactNode } from "react";
import { Locale } from "@/lib/i18n";
import { Toaster } from "@/components/toaster";

type LocaleContextType = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

const LocaleContext = createContext<LocaleContextType>({
  locale: "pl",
  setLocale: () => {},
});

export const useLocale = () => useContext(LocaleContext);

export function Providers({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("pl");

  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <LocaleContext.Provider value={{ locale, setLocale }}>
          {children}
          <Toaster />
        </LocaleContext.Provider>
      </ThemeProvider>
    </SessionProvider>
  );
}
