import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth/client";
import { registerFailedMessage } from "@/lib/auth-errors";
import { AuthScreen } from "@/components/app-shell";
import { CharCount } from "@/components/char-count";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  LIMITS,
  isValidEmail,
  normalizeDisplayName,
  normalizeEmail,
  validateDisplayName,
  validatePassword,
} from "@/lib/notebooks/validation";
import { persistSessionTokenFromAuthResponse } from "@/lib/session-token";
import { safeRedirectPath } from "@/lib/utils";

export const Route = createFileRoute("/register")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: safeRedirectPath(search.redirect),
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const { redirect } = Route.useSearch();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const displayName = normalizeDisplayName(name);
    const nameError = validateDisplayName(displayName);
    if (nameError) {
      setError(nameError);
      return;
    }
    const normalized = normalizeEmail(email);
    if (!isValidEmail(normalized)) {
      setError("メールアドレスの形式が正しくありません。");
      return;
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (password !== confirm) {
      setError("パスワードが一致しません。");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const { data, error: authError } = await authClient.signUp.email({
        email: normalized,
        password,
        name: displayName,
        fetchOptions: {
          onSuccess(ctx) {
            persistSessionTokenFromAuthResponse(ctx.response.headers, ctx.data);
          },
        },
      });
      if (authError) {
        setError(registerFailedMessage(authError));
        return;
      }
      persistSessionTokenFromAuthResponse(null, data);
      await authClient.getSession();
      router.history.push(redirect);
    } catch (err) {
      setError(registerFailedMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthScreen>
      <div className="mb-8">
        <p className="font-display text-sm text-muted">題箋</p>
        <h1 className="mt-1 font-display text-3xl font-medium tracking-tight">
          新規登録
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          確認メールは届きません。登録するとすぐに使い始められます。
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <Label htmlFor="name">表示名</Label>
            <CharCount value={name.length} max={LIMITS.nameMax} />
          </div>
          <Input
            id="name"
            autoComplete="name"
            value={name}
            maxLength={LIMITS.nameMax}
            onChange={(e) => setName(e.target.value)}
            placeholder="例：山田 太郎"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">メールアドレス</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">パスワード（8〜72文字、英字と数字）</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={LIMITS.passwordMin}
            maxLength={LIMITS.passwordMax}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm">パスワード（確認）</Label>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={LIMITS.passwordMin}
            maxLength={LIMITS.passwordMax}
          />
        </div>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "登録しています…" : "アカウントを作成する"}
        </Button>
      </form>
      <p className="mt-8 text-center text-sm text-muted">
        すでにアカウントをお持ちの方は{" "}
        <Link
          to="/login"
          search={{ redirect }}
          className="text-fg underline-offset-4 hover:underline"
        >
          ログイン
        </Link>
      </p>
    </AuthScreen>
  );
}
