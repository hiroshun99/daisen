import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { AppShell } from "@/components/app-shell";
import { CharCount } from "@/components/char-count";
import { TagInput } from "@/components/tag-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createNotebook, suggestNotebook } from "@/lib/notebooks/api";
import {
  LIMITS,
  applySuggestions,
  validateConfirm,
  validateDraft,
  type FieldErrors,
} from "@/lib/notebooks/validation";

export const Route = createFileRoute("/notebooks/new")({
  component: NewNotebookPage,
});

function NewNotebookPage() {
  return (
    <AppShell>
      <CreateNotebookForm />
    </AppShell>
  );
}

function CreateNotebookForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<"draft" | "review">("draft");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [summary, setSummary] = useState("");
  const [titleWasEmpty, setTitleWasEmpty] = useState(true);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [aiFailed, setAiFailed] = useState(false);

  const suggest = useMutation({
    mutationFn: () => suggestNotebook({ data: { title, body } }),
    onSuccess: (result) => {
      if (result.ok) {
        const applied = applySuggestions(
          { title, tags },
          result.suggestion,
          titleWasEmpty,
        );
        setTitle(applied.title);
        setTags(applied.tags);
        setSummary(applied.summary);
        setAiFailed(false);
      } else {
        setAiFailed(true);
      }
      setStep("review");
    },
    onError: () => {
      setAiFailed(true);
      setStep("review");
    },
  });

  const save = useMutation({
    mutationFn: () =>
      createNotebook({ data: { title, body, tags, summary } }),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      await navigate({ to: "/notebooks/$id", params: { id: created.id } });
    },
  });

  const draftErrors = useMemo(
    () => validateDraft({ title, body, tags }),
    [title, body, tags],
  );

  function onAskSuggest(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validateDraft({ title, body, tags });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setTitleWasEmpty(!title.trim());
    suggest.mutate();
  }

  function onConfirm(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validateConfirm({ title, body, tags, summary });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    save.mutate();
  }

  const busy = suggest.isPending || save.isPending;

  return (
    <div>
      <p className="text-sm text-muted">
        {step === "draft" ? "貼り付け" : "保存前の確認"}
      </p>
      <h1 className="mt-1 font-display text-3xl font-medium tracking-tight">
        {step === "draft" ? "本文を貼る" : "題と要約を確認"}
      </h1>

      {step === "draft" ? (
        <form onSubmit={onAskSuggest} className="mt-8 space-y-5">
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <Label htmlFor="body">貼り付ける本文</Label>
              <CharCount value={body.length} max={LIMITS.bodyMax} />
            </div>
            <Textarea
              id="body"
              value={body}
              disabled={busy}
              onChange={(e) => setBody(e.target.value)}
              placeholder="記事、議事、スレッド、AIの返答をここに貼り付けてください"
              required
              autoFocus
            />
            {errors.body ? (
              <p className="text-sm text-danger">{errors.body}</p>
            ) : draftErrors.body && body.length > LIMITS.bodyMax ? (
              <p className="text-sm text-danger">{draftErrors.body}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <Label htmlFor="title">タイトル（任意）</Label>
              <CharCount value={title.length} max={LIMITS.titleMax} />
            </div>
            <Input
              id="title"
              value={title}
              maxLength={LIMITS.titleMax}
              disabled={busy}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="空欄なら、本文から題を付けます"
            />
            {errors.title ? (
              <p className="text-sm text-danger">{errors.title}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button asChild variant="secondary">
              <Link to="/">
                <ArrowLeft />
                一覧に戻る
              </Link>
            </Button>
            <Button type="submit" disabled={busy || !body.trim()}>
              {suggest.isPending ? (
                <>
                  <LoaderCircle className="animate-spin" />
                  準備しています…
                </>
              ) : (
                "題を付けて確認"
              )}
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={onConfirm} className="mt-8 space-y-5">
          {aiFailed ? (
            <div className="rounded-[var(--radius-md)] bg-surface-2 px-4 py-3 text-sm leading-relaxed text-fg">
              自動提案に失敗しました。タイトルと要約はご自身で入力して保存できます。
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-muted">
              タイトルと要約を直してから保存してください。まだ保存はされていません。この要約は、あとで他のAIに渡すときの見出しになります。
            </p>
          )}

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <Label htmlFor="title-confirm">タイトル</Label>
              <CharCount value={title.length} max={LIMITS.titleMax} />
            </div>
            <Input
              id="title-confirm"
              value={title}
              maxLength={LIMITS.titleMax}
              disabled={busy}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            {errors.title ? (
              <p className="text-sm text-danger">{errors.title}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <Label htmlFor="summary">要約</Label>
              <CharCount value={summary.length} max={LIMITS.summaryMax} />
            </div>
            <Textarea
              id="summary"
              value={summary}
              disabled={busy}
              onChange={(e) => setSummary(e.target.value)}
              className="min-h-28"
              placeholder="空のままでも保存できます"
            />
            {errors.summary ? (
              <p className="text-sm text-danger">{errors.summary}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tags-confirm">タグ（任意）</Label>
            <TagInput
              id="tags-confirm"
              value={tags}
              onChange={setTags}
              disabled={busy}
            />
            <p className="text-xs text-subtle">
              使わなくても問題ありません。必要なときだけ付けてください。
            </p>
          </div>

          <section className="rounded-[var(--radius-lg)] bg-surface px-4 py-4 shadow-[var(--shadow-border)]">
            <h2 className="text-xs font-medium tracking-wide text-subtle">
              本文
            </h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">
              {body}
            </p>
          </section>

          {save.isError ? (
            <p className="text-sm text-danger">
              {save.error instanceof Error
                ? save.error.message
                : "保存できませんでした。"}
            </p>
          ) : null}

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button asChild variant="secondary">
              <Link to="/">
                <ArrowLeft />
                一覧に戻る
              </Link>
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => {
                setStep("draft");
                setAiFailed(false);
                setErrors({});
              }}
            >
              戻る
            </Button>
            <Button type="submit" disabled={busy || !title.trim()}>
              {save.isPending ? (
                <>
                  <LoaderCircle className="animate-spin" />
                  保存しています…
                </>
              ) : (
                "保存する"
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
