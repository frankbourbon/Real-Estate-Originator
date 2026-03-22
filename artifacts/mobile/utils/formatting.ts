import type { LOAApplication } from "@/context/ApplicationContext";

export function formatCurrency(value: string): string {
  const num = parseFloat(value.replace(/[^0-9.]/g, ""));
  if (isNaN(num)) return "—";
  if (num >= 1_000_000) {
    return `$${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `$${(num / 1_000).toFixed(0)}K`;
  }
  return `$${num.toFixed(0)}`;
}

export function formatCurrencyFull(value: string): string {
  const num = parseFloat(value.replace(/[^0-9.]/g, ""));
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function getPropertyShortAddress(app: LOAApplication): string {
  return app.propertyAddress;
}

export function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

export function formatPercent(value: string): string {
  const num = parseFloat(value);
  if (isNaN(num)) return "—";
  return `${num.toFixed(2)}%`;
}

export function formatSF(value: string): string {
  const num = parseInt(value);
  if (isNaN(num)) return "—";
  return `${num.toLocaleString()} SF`;
}
