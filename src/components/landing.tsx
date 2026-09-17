import { Link } from "@tanstack/react-router";
import { BookMarked, ClipboardPaste, FileDown, Type } from "lucide-react";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    icon: ClipboardPaste,
    title: "貼る",
    body: "記事、スレッド、議事、料金表。ブックマークせず、本文をノートに置く。",
  },
  {
    icon: Type,
    title: "題をつける",
    body: "保存の直前に、題と要約を提案する。空のタイトルでも、中身から名前が付く。",
  },
  {
    icon: FileDown,
    title: "持ち出す",
    body: "Markdown・CSV・PDF で書き出す。他の業務AIにナレッジとして渡せる。",
  },
];

export function Landing() {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="sticky top-0 z-20 border-b border-border bg-bg/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-4 px-4">
          <Link
            to="/"
            className="flex items-center gap-2 font-display text-base font-medium tracking-tight"
          >
            <span className="grid size-8 place-items-center rounded-[10px] bg-accent text-accent-fg">
              <BookMarked className="size-4" />
            </span>
            題箋
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/login" search={{ redirect: "/" }}>
                ログイン
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/register" search={{ redirect: "/" }}>
                はじめる
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-20">
        <section className="pt-10 sm:pt-16">
          <p className="text-sm tracking-wide text-muted">クリップして、題箋を貼る</p>
          <h1 className="mt-3 font-display text-[2rem] font-medium leading-tight tracking-tight sm:text-5xl">
            乱立する情報を、
            <br />
            ひとまず残す。
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted">
            タブもブックマークも、AIの出力も増え続ける。題箋はコピペした本文をノートに置き、題と要約を付けてからファイルとして持ち出せる場所です。
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link to="/register" search={{ redirect: "/" }}>
                ノートを作りはじめる
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link to="/login" search={{ redirect: "/" }}>
                ログイン
              </Link>
            </Button>
          </div>
        </section>

        <ol className="mt-14 grid gap-3 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="rounded-[var(--radius-xl)] bg-surface px-5 py-5 shadow-[var(--shadow-border)]"
            >
              <p className="text-xs tabular-nums text-subtle">0{index + 1}</p>
              <div className="mt-3 flex items-center gap-2 text-accent">
                <step.icon className="size-4" />
                <h2 className="font-display text-lg font-medium text-fg">
                  {step.title}
                </h2>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
            </li>
          ))}
        </ol>

        <section className="mt-10 rounded-[var(--radius-xl)] bg-accent px-6 py-8 text-accent-fg sm:px-8">
          <h2 className="font-display text-2xl font-medium tracking-tight">
            他のAIの素材になるノート
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-accent-fg/80">
            保存したノートは、その場で要約でき、Markdown で一括書き出しできます。チャットに貼れば、別の業務AIのナレッジになります。本文はアカウントごとに隔離されます。
          </p>
        </section>
      </main>
    </div>
  );
}
