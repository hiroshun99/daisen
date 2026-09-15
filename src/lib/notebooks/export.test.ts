import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import {
  CSV_COLUMNS,
  buildNotebookCsv,
  csvEscape,
  exportFilename,
} from "./export.ts";
import { buildNotebookPdf } from "./pdf.ts";

const sample = {
  id: "abc-123",
  title: '題名, "引用"',
  tags: ["仕事", "アイデア"],
  summary: "一行の要約",
  body: "本文の1行目\n本文の2行目, カンマあり",
  createdAt: "2026-09-14T12:00:00.000Z",
  updatedAt: "2026-09-15T01:00:00.000Z",
};

describe("csvEscape", () => {
  it("leaves simple values untouched", () => {
    assert.equal(csvEscape("hello"), "hello");
  });

  it("quotes commas, quotes, and newlines", () => {
    assert.equal(csvEscape("a,b"), '"a,b"');
    assert.equal(csvEscape('he said "hi"'), '"he said ""hi"""');
    assert.equal(csvEscape("a\nb"), '"a\nb"');
  });
});

describe("buildNotebookCsv", () => {
  it("starts with UTF-8 BOM and the specified columns", () => {
    const csv = buildNotebookCsv(sample);
    assert.equal(csv.startsWith("\uFEFF"), true);
    const header = csv.slice(1).split("\r\n")[0];
    assert.equal(header, CSV_COLUMNS.join(","));
  });

  it("joins tags with half-width commas and preserves body newlines", () => {
    const csv = buildNotebookCsv(sample);
    assert.match(csv, /仕事,アイデア/);
    assert.match(csv, /"本文の1行目\n本文の2行目, カンマあり"/);
    assert.match(csv, /"題名, ""引用"""/);
  });
});

describe("exportFilename", () => {
  it("uses notebook-{id}.{ext}", () => {
    assert.equal(exportFilename("abc-123", "csv"), "notebook-abc-123.csv");
    assert.equal(exportFilename("abc-123", "pdf"), "notebook-abc-123.pdf");
  });

  it("strips unsafe id characters", () => {
    assert.equal(exportFilename("../x", "csv"), "notebook-x.csv");
  });
});

describe("buildNotebookPdf", () => {
  it("produces a PDF that contains Japanese title text", async () => {
    const font = await readFile("public/fonts/MPLUS1p-Regular.ttf");
    const bytes = await buildNotebookPdf(sample, font);
    assert.equal(Buffer.from(bytes.subarray(0, 4)).toString(), "%PDF");
    assert.ok(bytes.byteLength > 1000);
  });
});
