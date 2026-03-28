import type { Borrower, Property } from "@/services/core";
import type { Comment } from "@/services/comments";

export function formatCurrency(value: string | number): string {
  const num = typeof value === "number" ? value : parseFloat(String(value).replace(/[^0-9.]/g, ""));
  if (isNaN(num)) return "—";
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
  return `$${num.toFixed(0)}`;
}

export function formatCurrencyFull(value: string | number): string {
  const num = typeof value === "number" ? value : parseFloat(String(value).replace(/[^0-9.]/g, ""));
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
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
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

export function formatTimeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return formatDate(iso);
}

export function formatSqFt(value: string): string {
  const num = parseInt(value);
  if (isNaN(num)) return "—";
  return `${num.toLocaleString()} SF`;
}

export function formatPct(value: string, decimals = 1): string {
  const num = parseFloat(value);
  if (isNaN(num)) return "—";
  return `${num.toFixed(decimals)}%`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function getBorrowerDisplayName(borrower: Borrower | undefined): string {
  if (!borrower) return "Unknown Borrower";
  const name = [borrower.firstName, borrower.lastName].filter(Boolean).join(" ");
  return name || borrower.entityName || "Unnamed Borrower";
}

export function getPropertyShortAddress(property: Property | undefined): string {
  if (!property) return "No property set";
  return property.streetAddress || "Address not set";
}

export function getPropertyCityState(property: Property | undefined): string {
  if (!property) return "";
  return [property.city, property.state].filter(Boolean).join(", ");
}

export function getTopLevelComments(comments: Comment[]): Comment[] {
  return comments.filter((c) => c.parentCommentId === null);
}

export function getReplies(comments: Comment[], parentId: string): Comment[] {
  return comments.filter((c) => c.parentCommentId === parentId);
}
