import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { AuthScreen } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { completePasswordReset } from "@/lib/account/api";
import { LIMITS } from "@/lib/notebooks/validation";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) {
      setError("再設定用のリンクが無効です。もう一度お手続きください。");
      return;
    }
    if (password.length < LIMITS.passwordMin) {
      setError(`パスワードは${LIMITS.passwordMin}文字以上にしてください。`);
      return;
    }
    if (password !== confirm) {
      setError("パスワードが一致しません。");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const result = await completePasswordReset({ data: { token, password } });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDone(true);
    } catch {
      setError("パスワードを更新できませんでした。時間をおいて再度お試しください。");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthScreen>
      <div className="mb-8">
        <p className="font-display text-sm text-muted">ブレインノート</p>
        <h1 className="mt-1 font-display text-3xl font-medium tracking-tight">
          新しいパスワード
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {done
            ? "パスワードを更新しました。新しいパスワードでログインしてください。"
            : "新しいパスワードを入力してください。"}
        </p>
      </div>

      {done ? (
        <Button
          className="w-full"
          onClick={() => navigate({ to: "/login", search: { redirect: "/" } })}
        >
          ログインする
        </Button>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password">新しいパスワード（8文字以上）</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={LIMITS.passwordMin}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">新しいパスワード（確認）</Label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={LIMITS.passwordMin}
            />
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={pending || !token}>
            {pending ? "更新しています…" : "パスワードを更新する"}
          </Button>
        </form>
      )}

      <p className="mt-8 text-center text-sm text-muted">
        <Link
          to="/forgot-password"
          className="text-fg underline-offset-4 hover:underline"
        >
          リンクが無効なときは、もう一度発行する
        </Link>
      </p>
    </AuthScreen>
  );
}
