import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { LIMITS, isValidEmail, normalizeEmail } from "@/lib/notebooks/validation";

const RESET_TTL_MS = 30 * 60 * 1000;
const RESET_PREFIX = "app-reset:";

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export const requestPasswordReset = createServerFn({ method: "POST" })
  .validator((input: { email: string }) => ({
    email: normalizeEmail(typeof input.email === "string" ? input.email : ""),
  }))
  .handler(async ({ data }): Promise<{ found: boolean; token?: string }> => {
    if (!isValidEmail(data.email)) {
      return { found: false };
    }
    const sql = await getSql();
    const users = await sql.query<{ id: string }>(
      `select "id" from "user" where email = $1 limit 1`,
      [data.email],
    );
    const user = users[0];
    if (!user) return { found: false };

    const accounts = await sql.query<{ id: string }>(
      `select "id" from "account" where "userId" = $1 and "providerId" = 'credential' limit 1`,
      [user.id],
    );
    if (!accounts[0]) return { found: false };

    await sql.query(
      `delete from "verification" where "value" = $1 and "identifier" like $2`,
      [user.id, `${RESET_PREFIX}%`],
    );

    const token = randomToken();
    const id = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + RESET_TTL_MS).toISOString();
    await sql.query(
      `insert into "verification" ("id", "identifier", "value", "expiresAt", "createdAt", "updatedAt")
       values ($1, $2, $3, $4, now(), now())`,
      [id, `${RESET_PREFIX}${token}`, user.id, expiresAt],
    );
    return { found: true, token };
  });

export const completePasswordReset = createServerFn({ method: "POST" })
  .validator((input: { token: string; password: string }) => ({
    token: typeof input.token === "string" ? input.token.trim() : "",
    password: typeof input.password === "string" ? input.password : "",
  }))
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
    if (!data.token) {
      return { ok: false, error: "再設定用のリンクが無効です。もう一度お手続きください。" };
    }
    if (data.password.length < LIMITS.passwordMin) {
      return {
        ok: false,
        error: `パスワードは${LIMITS.passwordMin}文字以上にしてください。`,
      };
    }
    const sql = await getSql();
    const rows = await sql.query<{ value: string; expiresAt: string | Date }>(
      `select "value", "expiresAt" from "verification" where "identifier" = $1 limit 1`,
      [`${RESET_PREFIX}${data.token}`],
    );
    const row = rows[0];
    if (!row) {
      return { ok: false, error: "再設定用のリンクが無効か、期限切れです。もう一度お手続きください。" };
    }
    const expires =
      row.expiresAt instanceof Date ? row.expiresAt : new Date(row.expiresAt);
    if (Number.isNaN(expires.getTime()) || expires.getTime() < Date.now()) {
      await sql.query(`delete from "verification" where "identifier" = $1`, [
        `${RESET_PREFIX}${data.token}`,
      ]);
      return { ok: false, error: "再設定用のリンクの期限が切れています。もう一度お手続きください。" };
    }

    const { hashPassword } = await import("better-auth/crypto");
    const hashed = await hashPassword(data.password);
    const updated = await sql.query<{ id: string }>(
      `update "account"
         set password = $1, "updatedAt" = now()
       where "userId" = $2 and "providerId" = 'credential'
       returning "id"`,
      [hashed, row.value],
    );
    await sql.query(`delete from "verification" where "identifier" = $1`, [
      `${RESET_PREFIX}${data.token}`,
    ]);
    await sql.query(`delete from "session" where "userId" = $1`, [row.value]);
    if (!updated[0]) {
      return { ok: false, error: "パスワードを更新できませんでした。" };
    }
    return { ok: true };
  });
