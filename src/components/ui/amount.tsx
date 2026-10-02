import { formatManwon, formatWon, formatWonSymbol } from "@/lib/format";

export type AmountTone =
  | "default"
  | "muted"
  | "decrease" // 부채 감소 — Primary Green
  | "increase" // 부채 증가 / 신규 대출 — Amber
  | "debt-change"; // 값의 부호로 자동 판단 (음수 = 감소, 양수 = 증가)

const toneClass: Record<Exclude<AmountTone, "debt-change">, string> = {
  default: "text-foreground",
  muted: "text-muted",
  decrease: "text-primary-text",
  increase: "text-increase",
};

interface AmountProps {
  value: number;
  /** won: 39,000,000원 / symbol: ₩39,000,000 / manwon: 3,900만원 */
  format?: "won" | "symbol" | "manwon";
  tone?: AmountTone;
  /** 양수에도 + 기호 표시 */
  signed?: boolean;
  className?: string;
}

export function Amount({ value, format = "won", tone = "default", signed = false, className = "" }: AmountProps) {
  const text =
    format === "symbol"
      ? formatWonSymbol(value, { signed })
      : format === "manwon"
        ? formatManwon(value, { signed })
        : formatWon(value, { signed });

  const resolvedTone =
    tone === "debt-change" ? (value < 0 ? "decrease" : value > 0 ? "increase" : "muted") : tone;

  return <span className={`num whitespace-nowrap ${toneClass[resolvedTone]} ${className}`}>{text}</span>;
}
