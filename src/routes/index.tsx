import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FileDown, Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Landing } from "@/components/landing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  listNotebooks,
  listNotebooksForExport,
  seedSampleNotebooks,
} from "@/lib/notebooks/api";
import {
  buildKnowledgeMarkdown,
  triggerTextDownload,
} from "@/lib/notebooks/export";
import { formatLocalDate } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const { user, isPending } = useCurrentUserState();

  if (isPending) {
    return (
      <div className="min-h-dvh bg-bg text-fg">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-4">
          <div className="h-8 w-36 animate-pulse rounded-[var(--radius-sm)] bg-surface-2" />
        </div>
        <div className="mx-auto max-w-3xl px-4 py-10">
          <div className="h-10 w-2/3 animate-pulse rounded-[var(--radius-sm)] bg-surface-2" />
          <div className="mt-6 h-28 animate-pulse rounded-[var(--radius-lg)] bg-surface-2" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Landing />;
  }

  return (
    <AppShell>
      <NotebookList />
    </AppShell>
  );
}

function NotebookList() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["notebooks"],
    queryFn: () => listNotebooks(),
  });

  const seed = useMutation({
    mutationFn: () => seedSampleNotebooks(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notebooks"] });
    },
  });

  const exportAll = useMutation({
    mutationFn: async () => {
      const notes = await listNotebooksForExport();
      triggerTextDownload(
        "daisen-knowledge.md",
        buildKnowledgeMarkdown(notes),
        "text/markdown;charset=utf-8",
      );
    },
  });

  return (
    <div>
      <p className="rounded-[var(--radius-lg)] bg-surface px-4 py-3 text-sm leading-relaxed text-muted shadow-[var(--shadow-border)]">
        乱立する情報を貼って残す。題と要約を付け、Markdown で他の業務AIへ渡せます。
      </p>
      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-medium tracking-tight">
            ノート
          </h1>
          <p className="mt-1 text-sm text-muted">
            {query.data
              ? query.data.length === 0
                ? "ウェブやAIの断片を、まずここに貼る。"
                : `${query.data.length}件 · ファイルとして書き出せます`
              : "自分のノートだけが表示されます。"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {query.data && query.data.length > 0 ? (
            <Button
              type="button"
              variant="secondary"
              disabled={exportAll.isPending}
              onClick={() => exportAll.mutate()}
            >
              <FileDown />
              {exportAll.isPending ? "書き出しています…" : "ナレッジを書き出す"}
            </Button>
          ) : null}
          <Button asChild>
            <Link to="/notebooks/new">
              <Plus />
              貼り付けて残す
            </Link>
          </Button>
        </div>
      </div>

      {query.isPending ? (
        <div className="mt-8 space-y-3">
          <Skeleton className="h-20 w-full rounded-[var(--radius-lg)]" />
          <Skeleton className="h-20 w-full rounded-[var(--radius-lg)]" />
        </div>
      ) : query.isError ? (
        <p className="mt-8 text-sm text-danger">
          一覧を読み込めませんでした。ページを再読み込みしてください。
        </p>
      ) : query.data.length === 0 ? (
        <div className="mt-10 rounded-[var(--radius-xl)] bg-surface px-6 py-12 text-center shadow-[var(--shadow-border)]">
          <p className="font-display text-lg">まだ何も貼っていません</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            記事、議事、料金表、AIの返答。本文を貼ると題と要約を提案します。
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild>
              <Link to="/notebooks/new">本文を貼る</Link>
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={seed.isPending}
              onClick={() => seed.mutate()}
            >
              {seed.isPending ? "用意しています…" : "デモ用の3件を入れる"}
            </Button>
          </div>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-border overflow-hidden rounded-[var(--radius-xl)] bg-surface shadow-[var(--shadow-border)]">
          {query.data.map((note) => (
            <li key={note.id}>
              <Link
                to="/notebooks/$id"
                params={{ id: note.id }}
                className="block px-5 py-4 transition-colors duration-[var(--motion-quick)] hover:bg-surface-2"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="min-w-0 truncate font-medium">{note.title}</h2>
                  <time
                    className="shrink-0 text-xs text-subtle tabular-nums"
                    dateTime={note.createdAt}
                  >
                    {formatLocalDate(note.createdAt)}
                  </time>
                </div>
                {note.summary ? (
                  <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted">
                    {note.summary}
                  </p>
                ) : null}
                {note.tags.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {note.tags.map((tag) => (
                      <Badge key={tag}>{tag}</Badge>
                    ))}
                  </div>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
