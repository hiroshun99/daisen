import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import {
  LIMITS,
  normalizeTitle,
  sanitizeTags,
  validateConfirm,
} from "./validation";
import { SAMPLE_NOTEBOOKS } from "./samples";

export type Notebook = {
  id: string;
  title: string;
  body: string;
  summary: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type NotebookListItem = {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  createdAt: string;
};

type NotebookRow = {
  id: string;
  title: string;
  body: string;
  summary: string;
  created_at: string;
  updated_at: string;
};

function toIso(value: string | Date): string {
  if (value instanceof Date) return value.toISOString();
  const asDate = new Date(value);
  return Number.isNaN(asDate.getTime()) ? String(value) : asDate.toISOString();
}

async function tagsFor(
  sql: Awaited<ReturnType<typeof getSql>>,
  notebookIds: string[],
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (notebookIds.length === 0) return map;
  const rows = await sql.query<{ notebook_id: string; tag: string }>(
    "select notebook_id, tag from notebook_tags where notebook_id = any($1::text[]) order by tag",
    [notebookIds],
  );
  for (const row of rows) {
    const list = map.get(row.notebook_id) ?? [];
    list.push(row.tag);
    map.set(row.notebook_id, list);
  }
  return map;
}

async function replaceTags(
  sql: Awaited<ReturnType<typeof getSql>>,
  notebookId: string,
  tags: string[],
) {
  await sql`delete from notebook_tags where notebook_id = ${notebookId}`;
  for (const tag of tags) {
    await sql`insert into notebook_tags (notebook_id, tag) values (${notebookId}, ${tag})`;
  }
}

export const listNotebooks = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<NotebookListItem[]> => {
    const sql = await getSql();
    const rows = await sql<
      Pick<NotebookRow, "id" | "title" | "summary" | "created_at">
    >`select id, title, summary, created_at from notebooks where user_id = ${context.userId} order by created_at desc`;
    const tagMap = await tagsFor(
      sql,
      rows.map((r) => r.id),
    );
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      summary: row.summary,
      tags: tagMap.get(row.id) ?? [],
      createdAt: toIso(row.created_at),
    }));
  });

export const listNotebooksForExport = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<Notebook[]> => {
    const sql = await getSql();
    const rows = await sql<NotebookRow>`
      select id, title, body, summary, created_at, updated_at
      from notebooks
      where user_id = ${context.userId}
      order by created_at desc
    `;
    const tagMap = await tagsFor(
      sql,
      rows.map((r) => r.id),
    );
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      summary: row.summary,
      tags: tagMap.get(row.id) ?? [],
      createdAt: toIso(row.created_at),
      updatedAt: toIso(row.updated_at),
    }));
  });

export const listMyTags = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<string[]> => {
    const sql = await getSql();
    const rows = await sql<{ tag: string }>`
      select distinct t.tag as tag
      from notebook_tags t
      inner join notebooks n on n.id = t.notebook_id
      where n.user_id = ${context.userId}
      order by t.tag
    `;
    return rows.map((r) => r.tag);
  });

export const getNotebook = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ context, data }): Promise<Notebook | null> => {
    const sql = await getSql();
    const rows = await sql<NotebookRow>`
      select id, title, body, summary, created_at, updated_at
      from notebooks
      where id = ${data.id} and user_id = ${context.userId}
    `;
    const row = rows[0];
    if (!row) return null;
    const tagMap = await tagsFor(sql, [row.id]);
    return {
      id: row.id,
      title: row.title,
      body: row.body,
      summary: row.summary,
      tags: tagMap.get(row.id) ?? [],
      createdAt: toIso(row.created_at),
      updatedAt: toIso(row.updated_at),
    };
  });

export const suggestNotebook = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { title: string; body: string }) => {
    const title = typeof input.title === "string" ? input.title : "";
    const body = typeof input.body === "string" ? input.body : "";
    if (!body.trim()) throw new Error("本文を入力してください");
    if (body.length > LIMITS.bodyMax) {
      throw new Error(`本文は${LIMITS.bodyMax}文字以内にしてください`);
    }
    if (title.length > LIMITS.titleMax) {
      throw new Error(`タイトルは${LIMITS.titleMax}文字以内にしてください`);
    }
    return { title, body };
  })
  .handler(async ({ data }) => {
    const { suggestNotebookMeta } = await import("./ai");
    return suggestNotebookMeta(data);
  });

export const createNotebook = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { title: string; body: string; tags: string[]; summary: string }) => input)
  .handler(async ({ context, data }) => {
    const errors = validateConfirm(data);
    if (Object.keys(errors).length > 0) {
      throw new Error(Object.values(errors)[0]);
    }
    const title = normalizeTitle(data.title);
    const { tags } = sanitizeTags(data.tags);
    const summary = data.summary.slice(0, LIMITS.summaryMax);
    const body = data.body;
    const id = crypto.randomUUID();
    const sql = await getSql();
    await sql`
      insert into notebooks (id, user_id, title, body, summary, created_at, updated_at)
      values (${id}, ${context.userId}, ${title}, ${body}, ${summary}, now(), now())
    `;
    await replaceTags(sql, id, tags);
    return { id };
  });

export const seedSampleNotebooks = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ created: number }> => {
    const sql = await getSql();
    const existing = await sql<{ count: number }>`
      select count(*)::int as count from notebooks where user_id = ${context.userId}
    `;
    if ((existing[0]?.count ?? 0) > 0) {
      return { created: 0 };
    }
    let created = 0;
    for (const sample of SAMPLE_NOTEBOOKS) {
      const id = crypto.randomUUID();
      await sql`
        insert into notebooks (id, user_id, title, body, summary, created_at, updated_at)
        values (${id}, ${context.userId}, ${sample.title}, ${sample.body}, ${sample.summary}, now(), now())
      `;
      await replaceTags(sql, id, sample.tags);
      created += 1;
    }
    return { created };
  });

export const updateNotebook = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: {
      id: string;
      title: string;
      body: string;
      tags: string[];
      summary: string;
    }) => input,
  )
  .handler(async ({ context, data }) => {
    const errors = validateConfirm(data);
    if (Object.keys(errors).length > 0) {
      throw new Error(Object.values(errors)[0]);
    }
    const title = normalizeTitle(data.title);
    const { tags } = sanitizeTags(data.tags);
    const summary = data.summary.slice(0, LIMITS.summaryMax);
    const sql = await getSql();
    const updated = await sql<{ id: string }>`
      update notebooks
      set title = ${title},
          body = ${data.body},
          summary = ${summary},
          updated_at = now()
      where id = ${data.id} and user_id = ${context.userId}
      returning id
    `;
    if (!updated[0]) return { ok: false as const };
    await replaceTags(sql, data.id, tags);
    return { ok: true as const };
  });

export const deleteNotebook = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const deleted = await sql<{ id: string }>`
      delete from notebooks
      where id = ${data.id} and user_id = ${context.userId}
      returning id
    `;
    return { ok: Boolean(deleted[0]) };
  });
