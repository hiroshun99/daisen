import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth/client";
import { loginFailedMessage } from "@/lib/auth-errors";
import { AuthScreen } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isValidEmail, normalizeEmail } from "@/lib/notebooks/validation";
import { persistSessionTokenFromAuthResponse } from "@/lib/session-token";
import { safeRedirectPath } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: safeRedirectPath(search.redirect),
  }),
  component: LoginPage,
});

function LoginPage() {
  const { redirect } = Route.useSearch();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const normalized = normalizeEmail(email);
    if (!isValidEmail(normalized) || password.length < 1) {
      setError("メールアドレスまたはパスワードが正しくありません。");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const { data, error: authError } = await authClient.signIn.email({
        email: normalized,
        password,
        rememberMe: true,
        fetchOptions: {
          onSuccess(ctx) {
            persistSessionTokenFromAuthResponse(ctx.response.headers, ctx.data);
          },
        },
      });
      if (authError) {
        setError(loginFailedMessage(authError));
        return;
      }
      persistSessionTokenFromAuthResponse(null, data);
      await authClient.getSession();
      router.history.push(redirect);
    } catch (err) {
      setError(loginFailedMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthScreen>
      <div className="mb-8">
        <p className="font-display text-sm text-muted">ブレインノート</p>
        <h1 className="mt-1 font-display text-3xl font-medium tracking-tight">
          ログイン
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          登録したメールアドレスとパスワードで入ってください。
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
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
          <div className="flex items-baseline justify-between gap-3">
            <Label htmlFor="password">パスワード</Label>
            <Link
              to="/forgot-password"
              className="text-xs text-muted underline-offset-4 hover:text-fg hover:underline"
            >
              パスワードをお忘れですか？
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error ? (
          <div className="space-y-2">
            <p className="text-sm text-danger">{error}</p>
            <p className="text-sm text-muted">
              パスワードが分からない場合は{" "}
              <Link
                to="/forgot-password"
                className="text-fg underline-offset-4 hover:underline"
              >
                再設定
              </Link>
              できます。アカウントが無い場合は{" "}
              <Link
                to="/register"
                search={{ redirect }}
                className="text-fg underline-offset-4 hover:underline"
              >
                新規登録
              </Link>
              してください。
            </p>
          </div>
        ) : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "ログインしています…" : "ログインする"}
        </Button>
      </form>
      <p className="mt-8 text-center text-sm text-muted">
        アカウントをお持ちでない方は{" "}
        <Link
          to="/register"
          search={{ redirect }}
          className="text-fg underline-offset-4 hover:underline"
        >
          新規登録
        </Link>
      </p>
    </AuthScreen>
  );
}
