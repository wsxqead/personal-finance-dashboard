import { addMonths } from "@/lib/dates";
import type { LoanProjection, MonthlyRecord, YearMonth } from "@/types/finance";

/** Debt Timeline 차트의 한 점. actual/forecast 중 하나(연결 지점은 둘 다)를 가집니다. */
export interface TimelinePoint {
  month: YearMonth;
  kind: "start" | "actual" | "forecast";
  actual?: number;
  forecast?: number;
  principalPaid: number;
  interestPaid: number;
  newBorrowing: number;
  debtChange: number;
}

/**
 * 실제 원장 + 예상치 → 차트용 데이터.
 * - 첫 점은 기록 시작 월 직전의 "기록 시작" 잔액(최초 부채)
 * - 마지막 실제 점에는 forecast 값도 넣어 실선과 점선이 이어지게 합니다.
 */
export function buildTimeline(
  ledger: MonthlyRecord[],
  forecast: MonthlyRecord[],
  initialDebt: number,
  trackingStart: YearMonth,
): TimelinePoint[] {
  const points: TimelinePoint[] = [
    {
      month: addMonths(trackingStart, -1),
      kind: "start",
      actual: initialDebt,
      // 월별 기록이 없으면 시작점에서 바로 예상선이 이어짐
      forecast: ledger.length === 0 && forecast.length > 0 && !forecast[0].missing?.balance ? initialDebt : undefined,
      principalPaid: 0,
      interestPaid: 0,
      newBorrowing: 0,
      debtChange: 0,
    },
  ];

  ledger.forEach((record, index) => {
    const isLast = index === ledger.length - 1;
    points.push({
      month: record.month,
      kind: "actual",
      actual: record.closingDebt,
      forecast: isLast && forecast.length > 0 && !forecast[0].missing?.balance ? record.closingDebt : undefined,
      principalPaid: record.principalPaid,
      interestPaid: record.interestPaid,
      newBorrowing: record.newBorrowing,
      debtChange: record.debtChange,
    });
  });

  for (const record of forecast) {
    points.push({
      month: record.month,
      kind: "forecast",
      // 일정표 미입력으로 월말 부채를 확정할 수 없으면 예상선을 그리지 않음
      forecast: record.missing?.balance ? undefined : record.closingDebt,
      principalPaid: record.principalPaid,
      interestPaid: record.interestPaid,
      newBorrowing: record.newBorrowing,
      debtChange: record.debtChange,
    });
  }

  return points;
}

/** 대출 하나의 잔액 추이 (실제 이력 + 예상 스케줄) */
export function buildLoanTimeline(projection: LoanProjection): TimelinePoint[] {
  const { history, schedule } = projection;
  const points: TimelinePoint[] = [];
  const first = history[0];

  // 실제 기록이 없으면 현재 잔액을 시작점으로 예상선만 그림
  if (!first && schedule.length > 0 && schedule[0].borrowed === 0) {
    points.push({
      month: addMonths(schedule[0].month, -1),
      kind: "start",
      actual: schedule[0].openingBalance,
      forecast: schedule[0].balanceKnown ? schedule[0].openingBalance : undefined,
      principalPaid: 0,
      interestPaid: 0,
      newBorrowing: 0,
      debtChange: 0,
    });
  }

  // 기록 시작 전부터 있던 대출은 시작 잔액을 첫 점으로
  if (first && first.borrowed === 0) {
    points.push({
      month: addMonths(first.month, -1),
      kind: "start",
      actual: first.openingBalance,
      principalPaid: 0,
      interestPaid: 0,
      newBorrowing: 0,
      debtChange: 0,
    });
  }

  history.forEach((row, index) => {
    const isLast = index === history.length - 1;
    points.push({
      month: row.month,
      kind: "actual",
      actual: row.closingBalance,
      forecast: isLast && schedule.length > 0 && schedule[0].balanceKnown ? row.closingBalance : undefined,
      principalPaid: row.principal,
      interestPaid: row.interest,
      newBorrowing: row.borrowed,
      debtChange: row.closingBalance - row.openingBalance,
    });
  });

  for (const row of schedule) {
    points.push({
      month: row.month,
      kind: "forecast",
      forecast: row.balanceKnown ? row.closingBalance : undefined,
      principalPaid: row.principal,
      interestPaid: row.interest,
      newBorrowing: row.borrowed,
      debtChange: row.closingBalance - row.openingBalance,
    });
  }
  return points;
}

/** 원금/이자 누적 막대 차트의 한 막대 */
export interface RepaymentBar {
  month: YearMonth;
  kind: "actual" | "forecast";
  principal: number;
  interest: number;
  balance: number;
  /** 월말 잔액을 확정할 수 있는지 */
  balanceKnown?: boolean;
  /** 미입력으로 합계에서 빠진 대출 수 */
  missingCount?: number;
  principalActual?: number;
  interestActual?: number;
  principalForecast?: number;
  interestForecast?: number;
}

/** 실제/예상 행 → 막대 데이터. 실제와 예상은 서로 다른 시리즈로 나눠 색을 구분합니다. */
export function buildRepaymentBars(
  rows: {
    month: YearMonth;
    kind: "actual" | "forecast";
    principal: number;
    interest: number;
    balance: number;
    balanceKnown?: boolean;
    missingCount?: number;
  }[],
): RepaymentBar[] {
  return rows.map((row) => ({
    ...row,
    ...(row.kind === "actual"
      ? { principalActual: row.principal, interestActual: row.interest }
      : { principalForecast: row.principal, interestForecast: row.interest }),
  }));
}
