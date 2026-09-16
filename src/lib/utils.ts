import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatLocalDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function safeRedirectPath(value: unknown): string {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  if (
    value.startsWith("/login") ||
    value.startsWith("/register") ||
    value.startsWith("/forgot-password") ||
    value.startsWith("/reset-password")
  ) {
    return "/";
  }
  return value;
}

/**
 * Pick a post-login path from the router and the real browser URL.
 * Either source can still be `/` on the first paint of a protected page.
 */
export function redirectPathFromLocations(
  routerPath: string,
  browserPath?: string | null,
): string {
  const fromBrowser = browserPath ? safeRedirectPath(browserPath) : "/";
  const fromRouter = safeRedirectPath(routerPath);
  if (fromBrowser !== "/") return fromBrowser;
  return fromRouter;
}
