import { X } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { LIMITS, normalizeTag, validateTag } from "@/lib/notebooks/validation";
import { cn } from "@/lib/utils";

type TagInputProps = {
  value: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
  id?: string;
};

export function TagInput({ value, onChange, disabled, id }: TagInputProps) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  function addTag(raw: string) {
    const tag = normalizeTag(raw);
    if (!tag) return;
    const tagError = validateTag(tag);
    if (tagError) {
      setError(tagError);
      return;
    }
    if (value.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      setDraft("");
      setError(null);
      return;
    }
    if (value.length >= LIMITS.tagsMaxCount) {
      setError(`タグは${LIMITS.tagsMaxCount}個までです。`);
      return;
    }
    onChange([...value, tag]);
    setDraft("");
    setError(null);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag(draft);
    } else if (event.key === "Backspace" && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "flex min-h-11 flex-wrap items-center gap-1.5 rounded-[var(--radius-sm)] bg-surface px-2 py-1.5 shadow-[var(--shadow-border)]",
          "focus-within:ring-2 focus-within:ring-accent/40",
        )}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex h-8 items-center gap-1 rounded-full bg-surface-2 pl-2.5 pr-1 text-sm text-fg"
          >
            {tag}
            <button
              type="button"
              disabled={disabled}
              aria-label={`${tag}を削除`}
              className="grid size-6 place-items-center rounded-full text-muted hover:bg-bg hover:text-fg"
              onClick={() => onChange(value.filter((t) => t !== tag))}
            >
              <X className="size-3.5" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          disabled={disabled || value.length >= LIMITS.tagsMaxCount}
          onChange={(e) => {
            setDraft(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => {
            if (draft.trim()) addTag(draft);
          }}
          placeholder={value.length === 0 ? "任意。Enter で追加" : ""}
          className="h-8 min-w-32 flex-1 bg-transparent px-1 text-sm text-fg outline-none placeholder:text-subtle disabled:cursor-not-allowed"
        />
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
