import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { LoaderCircle } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { CharCount } from "@/components/char-count";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  LIMITS,
  normalizeDisplayName,
  validateDisplayName,
  validatePassword,
} from "@/lib/notebooks/validation";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <AppShell>
      <SettingsForm />
    </AppShell>
  );
}

function SettingsForm() {
  const { user } = useCurrentUserState();
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.displayName) setName(user.displayName);
  }, [user?.displayName]);

  const saveName = useMutation({
    mutationFn: async () => {
      const next = normalizeDisplayName(name);
      const error = validateDisplayName(next);
      if (error) {
        setNameError(error);
        throw new Error(error);
      }
      const { error: updateError } = await authClient.updateUser({ name: next });
      if (updateError) {
        const message = "表示名を保存できませんでした。";
        setNameError(message);
        throw new Error(message);
      }
      await authClient.getSession();
    },
    onSuccess: () => {
      setNameError(null);
      toast.success("表示名を保存しました。");
    },
  });

  const savePassword = useMutation({
    mutationFn: async () => {
      const passwordError = validatePassword(newPassword);
      if (passwordError) {
        setPasswordError(passwordError);
        throw new Error(passwordError);
      }
      if (newPassword !== confirmPassword) {
        const error = "新しいパスワードが一致しません。";
        setPasswordError(error);
        throw new Error(error);
      }
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: false,
      });
      if (error) {
        const message =
          error.message?.toLowerCase().includes("password") ||
          error.status === 400
            ? "現在のパスワードが正しくありません。"
            : "パスワードを変更できませんでした。";
        setPasswordError(message);
        throw new Error(message);
      }
    },
    onSuccess: () => {
      setPasswordError(null);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("パスワードを変更しました。");
    },
  });

  function onSaveName(event: FormEvent) {
    event.preventDefault();
    saveName.mutate();
  }

  function onSavePassword(event: FormEvent) {
    event.preventDefault();
    savePassword.mutate();
  }

  return (
    <div className="space-y-10">
      <div>
        <p className="text-sm text-muted">アカウント</p>
        <h1 className="mt-1 font-display text-3xl font-medium tracking-tight">
          設定
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          画面右上に出る名前と、ログイン用のパスワードをここで変えられます。
        </p>
      </div>

      <form onSubmit={onSaveName} className="space-y-4">
        <h2 className="font-display text-lg font-medium">表示名</h2>
        <p className="text-sm text-muted">
          いまのログイン用メールアドレスは {user?.primaryEmail ?? "未設定"} です。
        </p>
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
            disabled={saveName.isPending}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) setNameError(null);
            }}
            required
          />
          {nameError ? <p className="text-sm text-danger">{nameError}</p> : null}
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={saveName.isPending}>
            {saveName.isPending ? (
              <>
                <LoaderCircle className="animate-spin" />
                保存しています…
              </>
            ) : (
              "表示名を保存する"
            )}
          </Button>
        </div>
      </form>

      <form onSubmit={onSavePassword} className="space-y-4">
        <h2 className="font-display text-lg font-medium">パスワード</h2>
        <p className="text-sm text-muted">
          ログイン中に、現在のパスワードを確認したうえで新しいパスワードへ変更できます。
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="current-password">現在のパスワード</Label>
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            disabled={savePassword.isPending}
            onChange={(e) => {
              setCurrentPassword(e.target.value);
              if (passwordError) setPasswordError(null);
            }}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-password">新しいパスワード（8〜72文字、英字と数字）</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            disabled={savePassword.isPending}
            onChange={(e) => {
              setNewPassword(e.target.value);
              if (passwordError) setPasswordError(null);
            }}
            required
            minLength={LIMITS.passwordMin}
            maxLength={LIMITS.passwordMax}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm-password">新しいパスワード（確認）</Label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            disabled={savePassword.isPending}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (passwordError) setPasswordError(null);
            }}
            required
            minLength={LIMITS.passwordMin}
            maxLength={LIMITS.passwordMax}
          />
        </div>
        {passwordError ? (
          <p className="text-sm text-danger">{passwordError}</p>
        ) : null}
        <div className="flex justify-end">
          <Button type="submit" disabled={savePassword.isPending}>
            {savePassword.isPending ? (
              <>
                <LoaderCircle className="animate-spin" />
                変更しています…
              </>
            ) : (
              "パスワードを変更する"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
