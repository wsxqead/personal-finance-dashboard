interface ProgressProps {
  /** 0~1 */
  value: number;
  tone?: "primary" | "muted";
  label?: string;
  className?: string;
}

export function Progress({ value, tone = "primary", label, className = "" }: ProgressProps) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 1000) / 10;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-label={label}
      className={`h-2 w-full overflow-hidden rounded-full bg-surface-alt ${className}`}
    >
      <div
        className={`h-full rounded-full ${tone === "primary" ? "bg-primary-strong" : "bg-muted/40"}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
