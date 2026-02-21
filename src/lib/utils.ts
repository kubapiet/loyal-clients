import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateCardNumber(): string {
  const prefix = "LC";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
  }).format(amount);
}

export function formatPoints(points: number): string {
  return new Intl.NumberFormat("pl-PL").format(points);
}

export function getDiscountForPoints(
  points: number,
  tiers: { minPoints: number; discountPercent: number }[]
): number {
  const sorted = [...tiers].sort((a, b) => b.minPoints - a.minPoints);
  const tier = sorted.find((t) => points >= t.minPoints);
  return tier?.discountPercent ?? 0;
}

export function getNextTier(
  points: number,
  tiers: { minPoints: number; discountPercent: number; label?: string | null }[]
): { minPoints: number; discountPercent: number; label?: string | null } | null {
  const sorted = [...tiers].sort((a, b) => a.minPoints - b.minPoints);
  return sorted.find((t) => t.minPoints > points) ?? null;
}

export function getProgressToNextTier(
  points: number,
  tiers: { minPoints: number; discountPercent: number }[]
): number {
  const sorted = [...tiers].sort((a, b) => a.minPoints - b.minPoints);
  const currentTierIndex = sorted.findIndex((t) => t.minPoints > points) - 1;
  const currentMin = currentTierIndex >= 0 ? sorted[currentTierIndex].minPoints : 0;
  const nextTier = sorted.find((t) => t.minPoints > points);
  if (!nextTier) return 100;
  const range = nextTier.minPoints - currentMin;
  const progress = points - currentMin;
  return Math.min(100, Math.round((progress / range) * 100));
}
