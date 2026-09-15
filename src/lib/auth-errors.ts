type AuthLikeError = {
  message?: string;
  code?: string;
  status?: string | number;
} | null;

function rawText(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (typeof error === "object") {
    const e = error as AuthLikeError;
    return `${e?.message ?? ""} ${e?.code ?? ""} ${e?.status ?? ""}`;
  }
  return "";
}

export function loginFailedMessage(error: unknown): string {
  const raw = rawText(error).toLowerCase();
  if (raw.includes("origin") || raw.includes("csrf")) {
    return "ログインできませんでした。ページを再読み込みして、もう一度お試しください。";
  }
  if (raw.includes("too many") || raw.includes("rate")) {
    return "試行が多すぎます。しばらく待ってから、もう一度お試しください。";
  }
  return "メールアドレスまたはパスワードが正しくありません。";
}

export function registerFailedMessage(error: unknown): string {
  const raw = rawText(error).toLowerCase();
  if (raw.includes("already") || raw.includes("exists") || raw.includes("unique")) {
    return "このメールアドレスでは登録できません。ログインするか、パスワードの再設定をお試しください。";
  }
  if (raw.includes("origin") || raw.includes("csrf")) {
    return "登録できませんでした。ページを再読み込みして、もう一度お試しください。";
  }
  return "登録できませんでした。入力内容を確認して、もう一度お試しください。";
}
