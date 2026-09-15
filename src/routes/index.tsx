import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listNotebooks } from "@/lib/notebooks/api";
import { formatLocalDate } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <AppShell>
      <NotebookList />
    </AppShell>
  );
}

function NotebookList() {
  const query = useQuery({
    queryKey: ["notebooks"],
    queryFn: () => listNotebooks(),
  });

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-medium tracking-tight">
            ノート
          </h1>
          <p className="mt-1 text-sm text-muted">
            {query.data
              ? query.data.length === 0
                ? "まだノートはありません。"
                : `${query.data.length}件`
              : "自分のノートだけが表示されます。"}
          </p>
        </div>
        <Button asChild>
          <Link to="/notebooks/new">
            <Plus />
            新しいノート
          </Link>
        </Button>
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
          <p className="font-display text-lg">ノートがまだありません</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            本文を書いて保存すると、タイトルと要約の提案を確認できます。
          </p>
          <Button asChild className="mt-6">
            <Link to="/notebooks/new">ノートを書く</Link>
          </Button>
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
