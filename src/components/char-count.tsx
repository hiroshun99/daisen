export function CharCount({ value, max }: { value: number; max: number }) {
  const over = value > max;
  return (
    <p className={`text-xs tabular-nums ${over ? "text-danger" : "text-subtle"}`}>
      {value.toLocaleString("ja-JP")} / {max.toLocaleString("ja-JP")}
    </p>
  );
}
