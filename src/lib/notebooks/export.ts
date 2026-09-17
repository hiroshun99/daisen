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

export function buildNotebookMarkdown(note: ExportNotebook): string {
  const tags = note.tags.length > 0 ? note.tags.map((t) => `\`${t}\``).join(" ") : "";
  const summary = note.summary.trim();
  const parts = [
    `# ${note.title || "無題"}`,
    "",
    tags ? `${tags}` : "",
    tags ? "" : "",
    summary ? `> ${summary.replaceAll("\n", "\n> ")}` : "",
    summary ? "" : "",
    note.body.trim(),
    "",
    `<!-- daisen id=${note.id} created=${note.createdAt} updated=${note.updatedAt} -->`,
    "",
  ];
  return parts.filter((line, i, arr) => !(line === "" && arr[i - 1] === "")).join("\n");
}

export function buildKnowledgeMarkdown(notes: ExportNotebook[]): string {
  const header = [
    "# 題箋ナレッジ",
    "",
    "コピーして他の業務AIに渡すための書き出しです。各ノートは題・要約・本文の順です。",
    "",
    `件数: ${notes.length}`,
    "",
    "---",
    "",
  ].join("\n");
  if (notes.length === 0) return header + "（ノートはありません）\n";
  return (
    header +
    notes
      .map((note) => buildNotebookMarkdown(note).trim())
      .join("\n\n---\n\n") +
    "\n"
  );
}

export function exportFilename(
  id: string,
  ext: "csv" | "pdf" | "md",
): string {
  const safe = id.replace(/[^a-zA-Z0-9_-]/g, "") || "note";
  return `notebook-${safe}.${ext}`;
}

export function notebookExportPath(
  id: string,
  format: "csv" | "pdf" | "md",
  options?: { access?: string | null; inline?: boolean; timeZone?: string },
) {
  const params = new URLSearchParams({ format });
  if (options?.access) params.set("access", options.access);
  if (options?.inline) params.set("inline", "1");
  if (options?.timeZone) params.set("tz", options.timeZone);
  return `/api/notebooks/${encodeURIComponent(id)}/export?${params.toString()}`;
}

export function triggerTextDownload(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
