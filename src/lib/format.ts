const wonFormatter = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 });

function withSign(text: string, value: number, signed: boolean): string {
  if (!signed || value === 0) return text;
  return value > 0 ? `+${text}` : `-${text}`;
}

/** 39000000 → "39,000,000" */
export function formatNumber(value: number): string {
  return wonFormatter.format(Math.round(value));
}

/** 39000000 → "39,000,000원" */
export function formatWon(value: number, { signed = false } = {}): string {
  return withSign(`${formatNumber(Math.abs(value))}원`, value, signed || value < 0);
}

/** 39000000 → "₩39,000,000" */
export function formatWonSymbol(value: number, { signed = false } = {}): string {
  return withSign(`₩${formatNumber(Math.abs(value))}`, value, signed || value < 0);
}

/**
 * 만원/억 단위 표기.
 * 39000000 → "3,900만원", 125000000 → "1억 2,500만원", 8500 → "8,500원"
 */
export function formatManwon(value: number, { signed = false, suffix = "원" } = {}): string {
  const abs = Math.abs(value);
  let text: string;

  if (abs < 10_000) {
    text = `${formatNumber(abs)}원`;
  } else {
    const totalMan = Math.round(abs / 10_000);
    const eok = Math.floor(totalMan / 10_000);
    const man = totalMan % 10_000;
    const parts: string[] = [];
    if (eok > 0) parts.push(`${formatNumber(eok)}억`);
    if (man > 0 || eok === 0) parts.push(`${formatNumber(man)}만`);
    text = `${parts.join(" ")}${suffix}`;
  }

  return withSign(text, value, signed || value < 0);
}

/** 차트 축 라벨: 39000000 → "3,900만" */
export function formatAxisManwon(value: number): string {
  return formatManwon(value, { suffix: "" });
}

/** 0.4265 → "42.6%" */
export function formatPercent(ratio: number, digits = 1): string {
  return `${(ratio * 100).toFixed(digits)}%`;
}
