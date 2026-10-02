import type { DateString, YearMonth } from "@/types/finance";

/**
 * 날짜는 모두 문자열 연산으로 처리합니다.
 * Date 객체를 쓰지 않으므로 서버/브라우저 시간대 차이로 값이 달라지지 않습니다.
 */

function parseMonth(month: YearMonth): { year: number; month: number } {
  const [year, m] = month.split("-").map(Number);
  if (!year || !m || m < 1 || m > 12) {
    throw new Error(`잘못된 월 형식입니다: "${month}" (YYYY-MM 형식이어야 합니다)`);
  }
  return { year, month: m };
}

export function toYearMonth(year: number, month: number): YearMonth {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function addMonths(month: YearMonth, amount: number): YearMonth {
  const { year, month: m } = parseMonth(month);
  const index = year * 12 + (m - 1) + amount;
  return toYearMonth(Math.floor(index / 12), (index % 12) + 1);
}

/** "2026-03-14" → "2026-03" */
export function monthOf(date: DateString): YearMonth {
  return date.slice(0, 7);
}

/** "2026-10" → "2026년 10월" */
export function formatMonth(month: YearMonth): string {
  const { year, month: m } = parseMonth(month);
  return `${year}년 ${m}월`;
}

/** "2026-10" → "26.10" (차트 축 등 좁은 곳) */
export function formatMonthShort(month: YearMonth): string {
  const { year, month: m } = parseMonth(month);
  return `${String(year).slice(2)}.${String(m).padStart(2, "0")}`;
}

/** "2026-03-14" → "2026년 3월 14일" */
export function formatDate(date: DateString): string {
  const { year, month } = parseMonth(monthOf(date));
  const day = Number(date.slice(8, 10));
  return `${year}년 ${month}월 ${day}일`;
}

/** "2026-03-14" → "26.03.14" */
export function formatDateShort(date: DateString): string {
  return `${formatMonthShort(monthOf(date))}.${date.slice(8, 10)}`;
}

/** month가 [start, end] 범위 안인지 (양 끝 생략 가능) */
export function isMonthInRange(month: YearMonth, start?: YearMonth, end?: YearMonth): boolean {
  return (!start || month >= start) && (!end || month <= end);
}

/** from 에서 to 까지 몇 개월인지 (같은 달이면 0, to 가 이전이면 음수) */
export function monthDiff(from: YearMonth, to: YearMonth): number {
  const a = parseMonth(from);
  const b = parseMonth(to);
  return (b.year - a.year) * 12 + (b.month - a.month);
}
