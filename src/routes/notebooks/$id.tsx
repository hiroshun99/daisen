import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { CharCount } from "@/components/char-count";
import { NotebookExport } from "@/components/notebook-export";
import { TagInput } from "@/components/tag-input";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { deleteNotebook, getNotebook, updateNotebook } from "@/lib/notebooks/api";
import {
  LIMITS,
  validateConfirm,
  type FieldErrors,
} from "@/lib/notebooks/validation";
import { formatLocalDate } from "@/lib/utils";

export const Route = createFileRoute("/notebooks/$id")({
  component: NotebookDetailPage,
});

function NotebookDetailPage() {
  const { id } = Route.useParams();
  return (
    <AppShell>
      <NotebookEditor id={id} />
    </AppShell>
  );
}

function NotebookEditor({ id }: { id: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const noteQuery = useQuery({
    queryKey: ["notebook", id],
    queryFn: () => getNotebook({ data: { id } }),
  });

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [summary, setSummary] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setHydrated(false);
    setErrors({});
  }, [id]);

  useEffect(() => {
    const note = noteQuery.data;
    if (!note) return;
    setTitle(note.title);
    setBody(note.body);
    setSummary(note.summary);
    setTags(note.tags);
    setHydrated(true);
  }, [noteQuery.data]);

  const dirty = useMemo(() => {
    const note = noteQuery.data;
    if (!note) return false;
    const currentTags = [...tags].sort().join("\0");
    const savedTags = [...note.tags].sort().join("\0");
    return (
      title !== note.title ||
      body !== note.body ||
      summary !== note.summary ||
      currentTags !== savedTags
    );
  }, [title, body, summary, tags, noteQuery.data]);

  const save = useMutation({
    mutationFn: () =>
      updateNotebook({ data: { id, title, body, tags, summary } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notebook", id] });
      await queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      setErrors({});
      toast.success("保存しました。");
    },
  });

  const remove = useMutation({
    mutationFn: () => deleteNotebook({ data: { id } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      toast.success("削除しました。");
      await navigate({ to: "/" });
    },
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next = validateConfirm({ title, body, tags, summary });
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    save.mutate();
  }

  if (noteQuery.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-24 w-full rounded-[var(--radius-lg)]" />
        <Skeleton className="h-48 w-full rounded-[var(--radius-lg)]" />
      </div>
    );
  }

  if (noteQuery.isError) {
    return (
      <p className="text-sm text-danger">
        ノートを読み込めませんでした。ページを再読み込みしてください。
      </p>
    );
  }

  if (!noteQuery.data) {
    return (
      <div className="rounded-[var(--radius-xl)] bg-surface px-6 py-12 text-center shadow-[var(--shadow-border)]">
        <p className="font-display text-lg">ノートが見つかりません</p>
        <Button asChild className="mt-6">
          <Link to="/">一覧に戻る</Link>
        </Button>
      </div>
    );
  }

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-24 w-full rounded-[var(--radius-lg)]" />
        <Skeleton className="h-48 w-full rounded-[var(--radius-lg)]" />
      </div>
    );
  }

  const note = noteQuery.data;
  const busy = save.isPending || remove.isPending;

  return (
    <form onSubmit={onSubmit}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {dirty ? (
            <p className="text-sm text-muted">未保存の変更があります。</p>
          ) : null}
          <p className={`text-xs text-subtle ${dirty ? "mt-1" : ""}`}>
            作成 {formatLocalDate(note.createdAt)}
            <span className="mx-2">·</span>
            更新 {formatLocalDate(note.updatedAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <Link to="/">
              <ArrowLeft />
              一覧に戻る
            </Link>
          </Button>
          <Button type="submit" disabled={busy || !dirty}>
            {save.isPending ? (
              <>
                <LoaderCircle className="animate-spin" />
                保存しています…
              </>
            ) : (
              "保存する"
            )}
          </Button>
          <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="outline">
                削除
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogTitle>このノートを削除しますか？</AlertDialogTitle>
              <AlertDialogDescription>
                削除すると元に戻せません。
              </AlertDialogDescription>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <Button
                  type="button"
                  variant="danger"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate()}
                >
                  {remove.isPending ? "削除しています…" : "削除する"}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="mt-3">
        <NotebookExport note={note} />
      </div>

      <div className="mt-6 space-y-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <Label htmlFor="title">タイトル</Label>
          <CharCount value={title.length} max={LIMITS.titleMax} />
        </div>
        <Input
          id="title"
          value={title}
          maxLength={LIMITS.titleMax}
          disabled={busy}
          onChange={(e) => setTitle(e.target.value)}
          className="font-display text-xl font-medium"
          required
        />
        {errors.title ? (
          <p className="text-sm text-danger">{errors.title}</p>
        ) : null}
      </div>

      <div className="mt-6 space-y-1.5">
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

      <div className="mt-6 space-y-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <Label htmlFor="body">本文</Label>
          <CharCount value={body.length} max={LIMITS.bodyMax} />
        </div>
        <Textarea
          id="body"
          value={body}
          disabled={busy}
          onChange={(e) => setBody(e.target.value)}
          required
        />
        {errors.body ? (
          <p className="text-sm text-danger">{errors.body}</p>
        ) : null}
      </div>

      <div className="mt-6 space-y-1.5">
        <Label htmlFor="tags">タグ（任意）</Label>
        <TagInput id="tags" value={tags} onChange={setTags} disabled={busy} />
      </div>

      {save.isError ? (
        <p className="mt-4 text-sm text-danger">
          {save.error instanceof Error
            ? save.error.message
            : "保存できませんでした。"}
        </p>
      ) : null}
    </form>
  );
}
