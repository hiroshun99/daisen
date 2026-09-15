import { clipSuggestion, LIMITS, type Suggestion } from "./validation";

const MODEL = "grok-4.5";
const TIMEOUT_MS = 20_000;

export type SuggestResult =
  | { ok: true; suggestion: Suggestion }
  | { ok: false; error: string };

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced?.[1] ?? trimmed;
  return JSON.parse(raw);
}

export async function suggestNotebookMeta(input: {
  body: string;
  title: string;
}): Promise<SuggestResult> {
  const apiKey = process.env.XAI_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "AI is not available" };
  }

  const title = input.title.trim();
  const body = input.body.slice(0, LIMITS.bodyMax);

  const system = [
    "あなたは日本語のノート整理アシスタントです。",
    "与えられた本文だけを根拠に、日本語の JSON だけを返してください。",
    "本文にない事実は足さない。推測で内容を膨らませない。",
    "出力スキーマ: {\"title\": string, \"tags\": string[], \"summary\": string}",
    `title は${LIMITS.titleMax}文字以内。本文の内容が分かる短い題名。体言止めで自然な日本語にする。`,
    "tags は必ず空の配列 [] にする。タグは提案しない。追加もしない。",
    `summary は本文の短い要約。${LIMITS.summaryMax}文字以内。です・ます調の自然な日本語。翻訳調や中国語直訳のような言い回しは使わない。`,
  ].join("\n");

  const user = title
    ? [
        `既存タイトル（上書き禁止。title にはこの文字列をそのまま返す）: ${title}`,
        "",
        "本文:",
        body,
      ].join("\n")
    : ["本文:", body].join("\n");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        max_tokens: 700,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!res.ok) {
      return { ok: false, error: `xAI API error ${res.status}` };
    }

    const payload = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) return { ok: false, error: "empty AI response" };

    const parsed = extractJson(content);
    if (!parsed || typeof parsed !== "object") {
      return { ok: false, error: "invalid JSON" };
    }
    const suggestion = clipSuggestion(parsed as Record<string, unknown>);
    suggestion.tags = [];
    return { ok: true, suggestion };
  } catch {
    return { ok: false, error: "AI request failed" };
  } finally {
    clearTimeout(timer);
  }
}
