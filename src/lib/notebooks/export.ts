export type ExportNotebook = {
  id: string;
  title: string;
  tags: string[];
  summary: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export const CSV_COLUMNS = [
  "id",
  "title",
  "tags",
  "summary",
  "body",
  "created_at",
  "updated_at",
] as const;

export function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

export function buildNotebookCsv(note: ExportNotebook): string {
  const row = [
    note.id,
    note.title,
    note.tags.join(","),
    note.summary,
    note.body,
    note.createdAt,
    note.updatedAt,
  ].map((value) => csvEscape(value));
  return `\uFEFF${CSV_COLUMNS.join(",")}\r\n${row.join(",")}\r\n`;
}

export function exportFilename(id: string, ext: "csv" | "pdf"): string {
  const safe = id.replace(/[^a-zA-Z0-9_-]/g, "") || "note";
  return `notebook-${safe}.${ext}`;
}

export function notebookExportPath(
  id: string,
  format: "csv" | "pdf",
  options?: { access?: string | null; inline?: boolean; timeZone?: string },
) {
  const params = new URLSearchParams({ format });
  if (options?.access) params.set("access", options.access);
  if (options?.inline) params.set("inline", "1");
  if (options?.timeZone) params.set("tz", options.timeZone);
  return `/api/notebooks/${encodeURIComponent(id)}/export?${params.toString()}`;
}
