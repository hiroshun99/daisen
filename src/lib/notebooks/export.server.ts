import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { requireUserId } from "@/lib/auth/verify.server";
import { getSql } from "@/lib/db";
import {
  buildNotebookCsv,
  buildNotebookMarkdown,
  exportFilename,
  type ExportNotebook,
} from "./export";
import { buildNotebookPdf } from "./pdf";

type NotebookRow = {
  id: string;
  title: string;
  body: string;
  summary: string;
  created_at: string | Date;
  updated_at: string | Date;
};

function toIso(value: string | Date): string {
  if (value instanceof Date) return value.toISOString();
  const asDate = new Date(value);
  return Number.isNaN(asDate.getTime()) ? String(value) : asDate.toISOString();
}

async function loadNotebook(
  userId: string,
  id: string,
): Promise<ExportNotebook | null> {
  const sql = await getSql();
  const rows = await sql<NotebookRow>`
    select id, title, body, summary, created_at, updated_at
    from notebooks
    where id = ${id} and user_id = ${userId}
  `;
  const row = rows[0];
  if (!row) return null;
  const tagRows = await sql<{ tag: string }>`
    select tag from notebook_tags where notebook_id = ${row.id} order by tag
  `;
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    summary: row.summary,
    tags: tagRows.map((item) => item.tag),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function disposition(kind: "attachment" | "inline", filename: string) {
  return `${kind}; filename="${filename}"; filename*=UTF-8''${filename}`;
}

async function loadExportFontBytes(request: Request): Promise<Uint8Array> {
  const candidates = [
    join(process.cwd(), "public/fonts/MPLUS1p-Regular.ttf"),
    join(process.cwd(), ".output/public/fonts/MPLUS1p-Regular.ttf"),
  ];
  for (const path of candidates) {
    try {
      return await readFile(path);
    } catch {
      /* try next */
    }
  }
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const origin = forwardedHost
    ? `${forwardedProto}://${forwardedHost.split(",")[0]!.trim()}`
    : new URL(request.url).origin;
  const response = await fetch(
    new URL("/fonts/MPLUS1p-Regular.ttf", `${origin}/`),
  );
  if (!response.ok) {
    throw new Error("フォントを読み込めませんでした。");
  }
  return new Uint8Array(await response.arrayBuffer());
}

export async function handleNotebookExport(
  request: Request,
  id: string,
): Promise<Response> {
  const url = new URL(request.url);
  const format = url.searchParams.get("format");
  if (format !== "csv" && format !== "pdf" && format !== "md") {
    return new Response("形式を指定してください。", { status: 400 });
  }
  const inline = url.searchParams.get("inline") === "1";
  const access = url.searchParams.get("access") ?? undefined;
  const timeZone = url.searchParams.get("tz") ?? undefined;

  let userId: string;
  try {
    userId = await requireUserId(access);
  } catch {
    return new Response("ログインが必要です。", { status: 401 });
  }

  const note = await loadNotebook(userId, id);
  if (!note) {
    return new Response("ノートが見つかりません。", { status: 404 });
  }

  const filename = exportFilename(note.id, format);
  const kind = inline ? "inline" : "attachment";

  if (format === "csv") {
    return new Response(buildNotebookCsv(note), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": disposition(kind, filename),
        "Cache-Control": "no-store",
      },
    });
  }

  if (format === "md") {
    return new Response(buildNotebookMarkdown(note), {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": disposition(kind, filename),
        "Cache-Control": "no-store",
      },
    });
  }

  const font = await loadExportFontBytes(request);
  const pdf = await buildNotebookPdf(note, font, { timeZone });
  return new Response(pdf as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": disposition(kind, filename),
      "Cache-Control": "no-store",
    },
  });
}
