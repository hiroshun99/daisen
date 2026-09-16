export const LIMITS = {
  titleMax: 100,
  bodyMax: 10_000,
  tagMin: 1,
  tagMax: 30,
  tagsMaxCount: 10,
  summaryMax: 500,
  passwordMin: 8,
  passwordMax: 72,
  nameMax: 40,
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(normalizeEmail(email));
}

export function normalizeDisplayName(name: string): string {
  return name.replace(/\s+/g, " ").trim();
}

export function validateDisplayName(name: string): string | null {
  const normalized = normalizeDisplayName(name);
  if (!normalized) return "表示名を入力してください。";
  if (normalized.length > LIMITS.nameMax) {
    return `表示名は${LIMITS.nameMax}文字以内にしてください。`;
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return "パスワードを入力してください。";
  if (password.length < LIMITS.passwordMin) {
    return `パスワードは${LIMITS.passwordMin}文字以上にしてください。`;
  }
  if (password.length > LIMITS.passwordMax) {
    return `パスワードは${LIMITS.passwordMax}文字以内にしてください。`;
  }
  const hasLetter = /[A-Za-z]/u.test(password);
  const hasDigit = /\d/u.test(password);
  if (!hasLetter || !hasDigit) {
    return "パスワードは英字と数字の両方を含めてください。";
  }
  return null;
}

export function normalizeTitle(title: string): string {
  return title.replace(/\s+/g, " ").trim();
}

export function normalizeTag(tag: string): string {
  return tag.replace(/\s+/g, " ").trim();
}

export function uniqueTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const tag = normalizeTag(raw);
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out;
}

export type FieldErrors = Record<string, string>;

export function validateTag(tag: string): string | null {
  const normalized = normalizeTag(tag);
  if (normalized.length < LIMITS.tagMin) return "タグを入力してください。";
  if (normalized.length > LIMITS.tagMax) {
    return `タグは${LIMITS.tagMax}文字以内にしてください。`;
  }
  return null;
}

export function sanitizeTags(tags: string[]): {
  tags: string[];
  error?: string;
} {
  const cleaned = uniqueTags(tags).filter((tag) => {
    const len = tag.length;
    return len >= LIMITS.tagMin && len <= LIMITS.tagMax;
  });
  if (cleaned.length > LIMITS.tagsMaxCount) {
    return {
      tags: cleaned.slice(0, LIMITS.tagsMaxCount),
      error: `タグは${LIMITS.tagsMaxCount}個までです。`,
    };
  }
  return { tags: cleaned };
}

export function validateDraft(input: {
  title: string;
  body: string;
  tags: string[];
}): FieldErrors {
  const errors: FieldErrors = {};
  const title = input.title;
  if (title.length > LIMITS.titleMax) {
    errors.title = `タイトルは${LIMITS.titleMax}文字以内にしてください。`;
  }
  const body = input.body;
  if (!body.trim()) {
    errors.body = "本文を入力してください。";
  } else if (body.length > LIMITS.bodyMax) {
    errors.body = `本文は${LIMITS.bodyMax}文字以内にしてください。`;
  }
  const tagCheck = sanitizeTags(input.tags);
  if (tagCheck.error) errors.tags = tagCheck.error;
  for (const tag of input.tags) {
    if (!normalizeTag(tag)) continue;
    const tagError = validateTag(tag);
    if (tagError) {
      errors.tags = tagError;
      break;
    }
  }
  return errors;
}

export function validateConfirm(input: {
  title: string;
  body: string;
  tags: string[];
  summary: string;
}): FieldErrors {
  const errors = validateDraft(input);
  const title = normalizeTitle(input.title);
  if (!title) {
    errors.title = "タイトルを入力してください。";
  } else if (title.length > LIMITS.titleMax) {
    errors.title = `タイトルは${LIMITS.titleMax}文字以内にしてください。`;
  }
  if (input.summary.length > LIMITS.summaryMax) {
    errors.summary = `要約は${LIMITS.summaryMax}文字以内にしてください。`;
  }
  return errors;
}

export type Suggestion = {
  title: string;
  tags: string[];
  summary: string;
};

export function applySuggestions(
  current: { title: string; tags: string[] },
  suggestion: Suggestion,
  titleWasEmpty: boolean,
): { title: string; tags: string[]; summary: string } {
  return {
    title: titleWasEmpty
      ? normalizeTitle(suggestion.title).slice(0, LIMITS.titleMax)
      : current.title,
    tags: sanitizeTags(current.tags).tags,
    summary: suggestion.summary.slice(0, LIMITS.summaryMax),
  };
}

export function clipSuggestion(raw: {
  title?: unknown;
  tags?: unknown;
  summary?: unknown;
}): Suggestion {
  const title =
    typeof raw.title === "string"
      ? normalizeTitle(raw.title).slice(0, LIMITS.titleMax)
      : "";
  const tags = Array.isArray(raw.tags)
    ? sanitizeTags(raw.tags.filter((t): t is string => typeof t === "string"))
        .tags
    : [];
  const summary =
    typeof raw.summary === "string"
      ? raw.summary.trim().slice(0, LIMITS.summaryMax)
      : "";
  return { title, tags, summary };
}
