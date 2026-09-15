/**
 * Persist the Better Auth session token for the live-preview iframe.
 * Preview cookies are partitioned, so email/password sign-in must store the
 * returned token under the same key `src/lib/auth/client.ts` reads.
 */
const BEARER_KEY = "grok-auth.bearer-token";

export function persistSessionToken(token: string | null | undefined) {
  if (typeof window === "undefined") return;
  if (!token) return;
  try {
    window.sessionStorage.setItem(BEARER_KEY, token);
  } catch {
    /* storage unavailable */
  }
}

export function persistSessionTokenFromAuthResponse(
  headers: { get: (name: string) => string | null } | null | undefined,
  body: unknown,
) {
  const headerToken = headers?.get("set-auth-token") ?? undefined;
  const bodyToken =
    body && typeof body === "object" && "token" in body
      ? (body as { token?: unknown }).token
      : undefined;
  persistSessionToken(
    headerToken ?? (typeof bodyToken === "string" ? bodyToken : undefined),
  );
}

export function clearSessionToken() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(BEARER_KEY);
  } catch {
    /* storage unavailable */
  }
}

/**
 * End the email/password session, drop the preview bearer, then leave for login.
 *
 * The platform `signOut()` skips the server call in live preview when no bearer
 * is stored. Email/password sessions often ride cookies instead, so skipping
 * leaves the visitor signed in and `/login` bounces them back home. Always ask
 * the server first, then clear local state.
 */
export async function signOutToLogin(redirectTo = "/login"): Promise<void> {
  const { authClient } = await import("@/lib/auth/client");
  try {
    const result = await Promise.race([
      authClient.signOut(),
      new Promise<{ error: { message: string } }>((resolve) => {
        window.setTimeout(
          () => resolve({ error: { message: "Sign-out timed out" } }),
          5000,
        );
      }),
    ]);
    if (result && "error" in result && result.error) {
      throw new Error(result.error.message);
    }
  } catch {
    try {
      await fetch("/api/auth/sign-out", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
    } catch {
      /* still clear locally */
    }
  }
  clearSessionToken();
  window.location.assign(redirectTo);
}
