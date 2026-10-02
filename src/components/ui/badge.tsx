import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "primary" | "increase";

const toneClass: Record<BadgeTone, string> = {
  neutral: "bg-surface-alt text-muted",
  primary: "bg-primary-soft text-primary-text",
  increase: "bg-increase-soft text-increase",
};

export function Badge({
  tone = "neutral",
  className = "",
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${toneClass[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
