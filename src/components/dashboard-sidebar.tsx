"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { useLocale } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  CreditCard,
  ArrowLeftRight,
  Layers,
  Megaphone,
  LogOut,
  Moon,
  Sun,
  Languages,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, labelKey: "nav.dashboard" },
  { href: "/dashboard/cards", icon: CreditCard, labelKey: "nav.cards" },
  { href: "/dashboard/transactions", icon: ArrowLeftRight, labelKey: "nav.transactions" },
  { href: "/dashboard/tiers", icon: Layers, labelKey: "nav.tiers" },
  { href: "/dashboard/promotions", icon: Megaphone, labelKey: "nav.promotions" },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { locale, setLocale } = useLocale();
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-full w-64 bg-card border-r transition-transform duration-300 md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex items-center gap-2 px-6 py-5 border-b">
            <CreditCard className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold">LoyaltyApp</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {t(item.labelKey, locale)}
                </Link>
              );
            })}
          </nav>

          {/* Bottom actions */}
          <div className="border-t px-3 py-4 space-y-2">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocale(locale === "pl" ? "en" : "pl")}
              >
                <Languages className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground uppercase">{locale}</span>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-muted-foreground"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="h-4 w-4" />
              {t("nav.logout", locale)}
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
