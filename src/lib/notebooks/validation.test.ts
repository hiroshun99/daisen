import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LIMITS,
  applySuggestions,
  clipSuggestion,
  sanitizeTags,
  validateConfirm,
  validateDisplayName,
  validateDraft,
  validatePassword,
} from "./validation.ts";

describe("body limit", () => {
  it("rejects 10,001 characters", () => {
    const body = "あ".repeat(LIMITS.bodyMax + 1);
    const errors = validateDraft({ title: "t", body, tags: [] });
    assert.equal(errors.body, `本文は${LIMITS.bodyMax}文字以内にしてください。`);
  });

  it("accepts 10,000 characters", () => {
    const body = "あ".repeat(LIMITS.bodyMax);
    const errors = validateDraft({ title: "t", body, tags: [] });
    assert.equal(errors.body, undefined);
  });

  it("rejects empty body", () => {
    const errors = validateDraft({ title: "", body: "   ", tags: [] });
    assert.equal(errors.body, "本文を入力してください。");
  });
});

describe("confirm title", () => {
  it("requires a title on confirm", () => {
    const errors = validateConfirm({
      title: "  ",
      body: "hello",
      tags: [],
      summary: "",
    });
    assert.equal(errors.title, "タイトルを入力してください。");
  });

  it("allows empty summary on confirm", () => {
    const errors = validateConfirm({
      title: "題",
      body: "hello",
      tags: [],
      summary: "",
    });
    assert.equal(errors.summary, undefined);
  });
});

describe("tags", () => {
  it("dedupes case-insensitively and caps at 10", () => {
    const many = Array.from({ length: 12 }, (_, i) => `tag${i}`);
    many.push("TAG0");
    const { tags, error } = sanitizeTags(many);
    assert.equal(tags.length, 10);
    assert.equal(error, "タグは10個までです。");
  });
});

describe("display name", () => {
  it("rejects empty names", () => {
    assert.equal(validateDisplayName("   "), "表示名を入力してください。");
  });

  it("rejects overly long names", () => {
    const name = "あ".repeat(LIMITS.nameMax + 1);
    assert.equal(
      validateDisplayName(name),
      `表示名は${LIMITS.nameMax}文字以内にしてください。`,
    );
  });
});

describe("password", () => {
  it("rejects short passwords", () => {
    assert.equal(
      validatePassword("Ab1"),
      `パスワードは${LIMITS.passwordMin}文字以上にしてください。`,
    );
  });

  it("rejects passwords over 72 characters", () => {
    const password = `A1${"b".repeat(LIMITS.passwordMax)}`;
    assert.equal(
      validatePassword(password),
      `パスワードは${LIMITS.passwordMax}文字以内にしてください。`,
    );
  });

  it("requires a letter and a digit", () => {
    assert.equal(
      validatePassword("abcdefgh"),
      "パスワードは英字と数字の両方を含めてください。",
    );
    assert.equal(
      validatePassword("12345678"),
      "パスワードは英字と数字の両方を含めてください。",
    );
  });

  it("accepts 8 to 72 mixed passwords", () => {
    assert.equal(validatePassword("Passw0rd"), null);
    assert.equal(validatePassword(`A1${"c".repeat(70)}`), null);
  });
});

describe("applySuggestions", () => {
  it("fills title only when it was empty and never adds suggested tags", () => {
    const filled = applySuggestions(
      { title: "", tags: ["既存"] },
      { title: "提案タイトル", tags: ["新規", "既存"], summary: "要約" },
      true,
    );
    assert.equal(filled.title, "提案タイトル");
    assert.deepEqual(filled.tags, ["既存"]);
    assert.equal(filled.summary, "要約");
  });

  it("does not overwrite an existing title or inject tags", () => {
    const filled = applySuggestions(
      { title: "自分の題", tags: [] },
      { title: "AI題", tags: ["a"], summary: "s" },
      false,
    );
    assert.equal(filled.title, "自分の題");
    assert.deepEqual(filled.tags, []);
  });
});

describe("clipSuggestion", () => {
  it("drops invalid fields", () => {
    const clipped = clipSuggestion({
      title: "  題  ",
      tags: ["ok", "", 1, "ok"],
      summary: "x".repeat(600),
    });
    assert.equal(clipped.title, "題");
    assert.deepEqual(clipped.tags, ["ok"]);
    assert.equal(clipped.summary.length, LIMITS.summaryMax);
  });
});
