import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { AuthScreen } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/lib/account/api";
import { isValidEmail, normalizeEmail } from "@/lib/notebooks/validation";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<
    { kind: "found"; token: string } | { kind: "missing" } | null
  >(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const normalized = normalizeEmail(email);
    if (!isValidEmail(normalized)) {
      setError("メールアドレスの形式が正しくありません。");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const next = await requestPasswordReset({ data: { email: normalized } });
      if (next.found && next.token) {
        setResult({ kind: "found", token: next.token });
      } else {
        setResult({ kind: "missing" });
      }
    } catch {
      setError("再設定の手続きを始められませんでした。時間をおいて再度お試しください。");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthScreen>
      <div className="mb-8">
        <p className="font-display text-sm text-muted">ブレインノート</p>
        <h1 className="mt-1 font-display text-3xl font-medium tracking-tight">
          パスワードの再設定
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          登録したメールアドレスを入力してください。確認メールは送れないため、この画面で再設定用のリンクをお渡しします。
        </p>
      </div>

      {result?.kind === "found" ? (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-fg">
            再設定用のリンクを発行しました。30分以内に開いて、新しいパスワードを設定してください。この画面を閉じると、リンクは再表示できません。
          </p>
          <Button asChild className="w-full">
            <Link to="/reset-password" search={{ token: result.token }}>
              新しいパスワードを設定する
            </Link>
          </Button>
        </div>
      ) : result?.kind === "missing" ? (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-fg">
            このメールアドレスのアカウントは見つかりませんでした。別のアドレスで登録しているか、まだアカウントを作っていない可能性があります。
          </p>
          <Button asChild className="w-full">
            <Link to="/register" search={{ redirect: "/" }}>
              新規登録する
            </Link>
          </Button>
          <Button asChild variant="secondary" className="w-full">
            <Link to="/login" search={{ redirect: "/" }}>
              ログインに戻る
            </Link>
          </Button>
        </div>
      ) : (
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
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "確認しています…" : "再設定用のリンクを発行する"}
          </Button>
        </form>
      )}

      <p className="mt-8 text-center text-sm text-muted">
        <Link
          to="/login"
          search={{ redirect: "/" }}
          className="text-fg underline-offset-4 hover:underline"
        >
          ログインに戻る
        </Link>
      </p>
    </AuthScreen>
  );
}
