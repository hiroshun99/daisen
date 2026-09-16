export function env(key: string): string | undefined {
  const v = process.env[key]?.trim();
  return v || undefined;
}

/**
 * Postgres URL from this app's env or Vercel/Neon Storage aliases.
 * Neon on Vercel often injects `POSTGRES_URL` instead of `DATABASE_URL`.
 */
export function databaseUrlFromEnv(): string | undefined {
  return (
    env("DATABASE_URL") ||
    env("POSTGRES_URL") ||
    env("POSTGRES_URL_NON_POOLING") ||
    env("DATABASE_URL_UNPOOLED")
  );
}

/**
 * Workspace preview vs deployed app. The deployer writes GROK_PROJECT_ID on
 * every publish; the sandbox preview never has it. Single source of truth for
 * the split — gate audience, gate endpoints and connector-token semantics all
 * key off this predicate.
 */
export function isWorkspacePreview(): boolean {
  return !env("GROK_PROJECT_ID");
}
