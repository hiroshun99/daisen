import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { ExportNotebook } from "./export";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const CREAM = rgb(246 / 255, 243 / 255, 237 / 255);
const INK = rgb(28 / 255, 25 / 255, 23 / 255);
const MUTED = rgb(107 / 255, 101 / 255, 96 / 255);
const ACCENT = rgb(47 / 255, 74 / 255, 60 / 255);
const SURFACE = rgb(255 / 255, 252 / 255, 247 / 255);

const FONT_URL = "/fonts/MPLUS1p-Regular.ttf";

let fontBytesPromise: Promise<ArrayBuffer> | null = null;

export function loadExportFont(): Promise<ArrayBuffer> {
  if (!fontBytesPromise) {
    fontBytesPromise = fetch(FONT_URL).then(async (response) => {
      if (!response.ok) {
        fontBytesPromise = null;
        throw new Error("フォントを読み込めませんでした。");
      }
      return response.arrayBuffer();
    });
  }
  return fontBytesPromise;
}

function formatPdfDate(value: string, timeZone?: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timeZone || undefined,
  });
}

function sanitizeForFont(text: string, allowed: Set<number>): string {
  let out = "";
  for (const char of text) {
    if (char === "\n" || char === "\r" || char === "\t") {
      out += char;
      continue;
    }
    const code = char.codePointAt(0);
    if (code === undefined) continue;
    if (allowed.has(code)) out += char;
    else out += allowed.has(0x30fb) ? "・" : "?";
  }
  return out;
}

function wrapLine(text: string, font: PDFFont, size: number, maxWidth: number) {
  if (!text) return [""];
  const lines: string[] = [];
  let current = "";
  for (const char of text) {
    const next = current + char;
    if (current && font.widthOfTextAtSize(next, size) > maxWidth) {
      lines.push(current);
      current = char;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const paragraphs = text.replaceAll("\r\n", "\n").replaceAll("\r", "\n").split("\n");
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    lines.push(...wrapLine(paragraph, font, size, maxWidth));
  }
  return lines;
}

type Cursor = {
  doc: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  y: number;
  pageNumber: number;
};

function paintPage(page: PDFPage) {
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    color: CREAM,
  });
}

function addPage(cursor: Cursor) {
  cursor.page = cursor.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  paintPage(cursor.page);
  cursor.y = PAGE_HEIGHT - MARGIN;
  cursor.pageNumber += 1;
}

function ensureSpace(cursor: Cursor, needed: number) {
  if (cursor.y - needed < MARGIN + 28) addPage(cursor);
}

function lineHeightFor(font: PDFFont, size: number, extra = 1.45) {
  return Math.ceil(font.heightAtSize(size) * extra);
}

function drawLines(
  cursor: Cursor,
  lines: string[],
  size: number,
  color: ReturnType<typeof rgb>,
  lineHeight?: number,
) {
  const step = lineHeight ?? lineHeightFor(cursor.font, size);
  for (const line of lines) {
    ensureSpace(cursor, step);
    if (line) {
      cursor.page.drawText(line, {
        x: MARGIN,
        y: cursor.y - size,
        size,
        font: cursor.font,
        color,
      });
    }
    cursor.y -= step;
  }
}

export async function buildNotebookPdf(
  note: ExportNotebook,
  fontBytes: ArrayBuffer | Uint8Array,
  options?: { timeZone?: string },
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const bytes =
    fontBytes instanceof ArrayBuffer ? new Uint8Array(fontBytes) : fontBytes;
  const font = await doc.embedFont(bytes, { subset: true });
  const allowed = new Set(font.getCharacterSet());
  const clean = (value: string) => sanitizeForFont(value, allowed);

  const title = clean(note.title || "無題");
  const tags = clean(
    note.tags.length > 0 ? `タグ ${note.tags.join("、")}` : "タグ なし",
  );
  const created = clean(`作成 ${formatPdfDate(note.createdAt, options?.timeZone)}`);
  const updated = clean(`更新 ${formatPdfDate(note.updatedAt, options?.timeZone)}`);
  const summary = clean(note.summary.trim() || "（なし）");
  const body = clean(note.body);

  const cursor: Cursor = {
    doc,
    page: doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]),
    font,
    y: PAGE_HEIGHT - MARGIN,
    pageNumber: 1,
  };
  paintPage(cursor.page);

  cursor.page.drawText(clean("題箋"), {
    x: MARGIN,
    y: cursor.y - 10,
    size: 10,
    font,
    color: ACCENT,
  });
  cursor.y -= 28;

  const titleLines = wrapText(title, font, 18, CONTENT_WIDTH);
  drawLines(cursor, titleLines, 18, INK);
  cursor.y -= 8;

  drawLines(cursor, wrapText(tags, font, 10, CONTENT_WIDTH), 10, MUTED);
  drawLines(
    cursor,
    wrapText(`${created}  ·  ${updated}`, font, 9, CONTENT_WIDTH),
    9,
    MUTED,
  );
  cursor.y -= 16;

  const summaryLineHeight = lineHeightFor(font, 11, 1.5);
  const summaryLines = wrapText(summary, font, 11, CONTENT_WIDTH - 24);
  const summaryHeight = 22 + summaryLines.length * summaryLineHeight + 16;
  ensureSpace(cursor, summaryHeight);
  cursor.page.drawRectangle({
    x: MARGIN,
    y: cursor.y - summaryHeight,
    width: CONTENT_WIDTH,
    height: summaryHeight,
    color: SURFACE,
  });
  cursor.page.drawText(clean("要約"), {
    x: MARGIN + 12,
    y: cursor.y - 18,
    size: 9,
    font,
    color: ACCENT,
  });
  cursor.y -= 28;
  for (const line of summaryLines) {
    cursor.page.drawText(line, {
      x: MARGIN + 12,
      y: cursor.y - 11,
      size: 11,
      font,
      color: INK,
    });
    cursor.y -= summaryLineHeight;
  }
  cursor.y -= 20;

  cursor.page.drawText(clean("本文"), {
    x: MARGIN,
    y: cursor.y - 10,
    size: 9,
    font,
    color: ACCENT,
  });
  cursor.y -= 22;
  drawLines(cursor, wrapText(body, font, 11, CONTENT_WIDTH), 11, INK);

  const pages = doc.getPages();
  pages.forEach((page, index) => {
    const label = clean(`${index + 1} / ${pages.length}`);
    page.drawText(label, {
      x: PAGE_WIDTH - MARGIN - font.widthOfTextAtSize(label, 9),
      y: 24,
      size: 9,
      font,
      color: MUTED,
    });
  });

  return doc.save();
}
