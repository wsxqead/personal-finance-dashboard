import { cards as defaultCards } from "@/data/cards";
import { fixedExpenses as defaultFixedExpenses } from "@/data/fixed-expenses";
import { loans as defaultLoans } from "@/data/loans";
import { monthlyRecords as defaultRecords } from "@/data/monthly-records";
import { profile } from "@/data/profile";
import { addMonths, isMonthInRange, monthOf } from "@/lib/dates";
import type {
  Card,
  DebtSummary,
  FixedExpense,
  Loan,
  MonthlyRecord,
  MonthlyRecordInput,
  YearMonth,
} from "@/types/finance";

/**
 * 재무 계산의 핵심.
 * 데이터 파일에는 "사실"만 적고, 합계·잔액·변화량은 모두 여기서 계산합니다.
 * 데이터에 오류(없는 대출 ID, 빠진 월 등)가 있으면 빌드 단계에서 에러로 알려줍니다.
 */

export function sum(values: Iterable<number>): number {
  let total = 0;
  for (const value of values) total += value;
  return total;
}

export function sumRecord(record: Record<string, number>): number {
  return sum(Object.values(record));
}

export function getInitialBalance(loan: Loan): number {
  return loan.openingBalance ?? loan.originalAmount;
}

/** 기록 시작 월 (openingBalance 기준 월) */
export const TRACKING_START_MONTH: YearMonth = profile.trackingStartMonth;

/** "" 나 공백뿐인 문자열은 미입력으로 봅니다. */
export function filled(value: string | undefined | null): value is string {
  return typeof value === "string" && value.trim() !== "";
}

/** 대출 실행 월 (startedAt 미입력이면 undefined) */
export function getLoanStartMonth(loan: Loan): YearMonth | undefined {
  return filled(loan.startedAt) ? monthOf(loan.startedAt) : undefined;
}

/** 월 납입일 (0 또는 미입력이면 undefined) */
export function getPaymentDay(loan: Loan): number | undefined {
  return loan.paymentDay && loan.paymentDay > 0 ? loan.paymentDay : undefined;
}

/** 기록 시작 전부터 있던 대출인지 (실행일 미입력이면 기존 대출로 봄) */
export function existsAtTrackingStart(loan: Loan, trackingStart: YearMonth = TRACKING_START_MONTH): boolean {
  const start = getLoanStartMonth(loan);
  return start === undefined || start < trackingStart;
}

/** 기록 시작 시점의 대출별 잔액 */
export function getInitialBalances(
  loanList: Loan[] = defaultLoans,
  trackingStart: YearMonth = TRACKING_START_MONTH,
): Record<string, number> {
  const balances: Record<string, number> = {};
  for (const loan of loanList) {
    if (existsAtTrackingStart(loan, trackingStart)) balances[loan.id] = getInitialBalance(loan);
  }
  return balances;
}

/** 마지막 실제 기록 기준 대출별 잔액 (기록이 없으면 기록 시작 시점 잔액) */
export function getCurrentBalances(
  ledger: MonthlyRecord[],
  loanList: Loan[] = defaultLoans,
  trackingStart: YearMonth = TRACKING_START_MONTH,
): Record<string, number> {
  return ledger.length > 0 ? ledger[ledger.length - 1].loanBalances : getInitialBalances(loanList, trackingStart);
}

/** 이번 달 = 마지막 실제 기록의 다음 달 (기록이 없으면 기록 시작 월) */
export function getCurrentMonth(ledger: MonthlyRecord[], trackingStart: YearMonth = TRACKING_START_MONTH): YearMonth {
  return ledger.length > 0 ? addMonths(ledger[ledger.length - 1].month, 1) : trackingStart;
}

/** 해당 월에 적용되는 고정지출 항목 */
export function getActiveFixedExpenses(
  month: YearMonth,
  items: FixedExpense[] = defaultFixedExpenses,
): FixedExpense[] {
  return items.filter((item) => isMonthInRange(month, item.startMonth, item.endMonth));
}

export function getFixedExpenseTotal(month: YearMonth, items: FixedExpense[] = defaultFixedExpenses): number {
  return sum(getActiveFixedExpenses(month, items).map((item) => item.amount));
}

export function getExpectedCardTotal(cardList: Card[] = defaultCards): number {
  return sum(cardList.map((card) => card.expectedMonthly ?? card.currentPayment ?? 0));
}

/** 카드 미결제 금액 합계 (대출과 별도로 관리) */
export function getCardOutstandingTotal(cardList: Card[] = defaultCards): number {
  return sum(cardList.map((card) => card.outstandingBalance ?? 0));
}

function validateRecords(
  records: MonthlyRecordInput[],
  loanList: Loan[],
  cardList: Card[],
  trackingStart: YearMonth,
) {
  if (records.length > 0 && records[0].month !== trackingStart) {
    throw new Error(
      `monthly-records.ts 의 첫 기록(${records[0].month})은 profile.ts 의 trackingStartMonth(${trackingStart}) 와 같아야 합니다.`,
    );
  }
  const loanIds = new Set(loanList.map((loan) => loan.id));
  const cardIds = new Set(cardList.map((card) => card.id));

  records.forEach((record, index) => {
    if (index > 0 && record.month !== addMonths(records[index - 1].month, 1)) {
      throw new Error(
        `월별 기록은 빠짐없이 연속되어야 합니다: ${records[index - 1].month} 다음에 ${record.month}`,
      );
    }
    for (const loanId of Object.keys(record.loanPayments)) {
      if (!loanIds.has(loanId)) throw new Error(`${record.month}: 알 수 없는 대출 ID "${loanId}"`);
    }
    for (const cardId of Object.keys(record.cardPayments)) {
      if (!cardIds.has(cardId)) throw new Error(`${record.month}: 알 수 없는 카드 ID "${cardId}"`);
    }
  });
}

/**
 * 월별 입력 기록 → 기초/기말 부채가 포함된 전체 원장.
 *
 * - 기록 시작 월보다 먼저 실행된(또는 실행일 미입력) 대출은 "최초 부채"에 포함됩니다.
 * - 기록 시작 월 이후 실행된 대출은 해당 월의 "신규 대출"로 집계됩니다.
 * - 월별 기록이 하나도 없으면 빈 배열을 돌려줍니다.
 */
export function buildLedger(
  records: MonthlyRecordInput[] = defaultRecords,
  loanList: Loan[] = defaultLoans,
  cardList: Card[] = defaultCards,
  fixedItems: FixedExpense[] = defaultFixedExpenses,
  trackingStart: YearMonth = TRACKING_START_MONTH,
): MonthlyRecord[] {
  const sorted = [...records].sort((a, b) => a.month.localeCompare(b.month));
  validateRecords(sorted, loanList, cardList, trackingStart);

  const balances = getInitialBalances(loanList, trackingStart);

  return sorted.map((input) => {
    const openingDebt = sumRecord(balances);
    let newBorrowing = 0;

    for (const loan of loanList) {
      if (getLoanStartMonth(loan) === input.month) {
        balances[loan.id] = getInitialBalance(loan);
        newBorrowing += getInitialBalance(loan);
      }
    }

    let principalPaid = 0;
    let interestPaid = 0;
    for (const [loanId, payment] of Object.entries(input.loanPayments)) {
      if (!(loanId in balances)) {
        throw new Error(`${input.month}: "${loanId}" 는 아직 실행되지 않은 대출입니다 (startedAt 확인).`);
      }
      const borrowed = payment.borrowed ?? 0;
      balances[loanId] += borrowed - payment.principal;
      newBorrowing += borrowed;
      principalPaid += payment.principal;
      interestPaid += payment.interest;
    }

    const closingDebt = sumRecord(balances);
    const cardPayment = sumRecord(input.cardPayments);
    const fixedExpenses = input.fixedExpenses ?? getFixedExpenseTotal(input.month, fixedItems);
    const loanPayment = principalPaid + interestPaid;

    return {
      month: input.month,
      isForecast: false,
      income: input.income,
      openingDebt,
      principalPaid,
      interestPaid,
      newBorrowing,
      cardPayment,
      fixedExpenses,
      livingExpenses: input.livingExpenses,
      closingDebt,
      debtChange: closingDebt - openingDebt,
      loanPayment,
      cashBalance:
        input.income + newBorrowing - loanPayment - cardPayment - fixedExpenses - input.livingExpenses,
      loanBalances: { ...balances },
      loanPayments: input.loanPayments,
      review: input.review,
      note: input.note,
    };
  });
}

/**
 * 누적 원금 상환과 순부채 감소는 다를 수 있습니다.
 *   순부채 감소 = 누적 원금 상환 - 누적 신규 대출 = 최초 부채 - 현재 부채
 * 월별 기록이 없으면 최초 부채 = 현재 부채 = 기록 시작 시점 잔액 합계입니다.
 */
export function getDebtSummary(
  ledger: MonthlyRecord[],
  loanList: Loan[] = defaultLoans,
  trackingStart: YearMonth = TRACKING_START_MONTH,
): DebtSummary {
  const initialDebt = sumRecord(getInitialBalances(loanList, trackingStart));
  const currentDebt = ledger.length > 0 ? ledger[ledger.length - 1].closingDebt : initialDebt;

  let peakDebt = initialDebt;
  let peakMonth = trackingStart;
  for (const record of ledger) {
    if (record.closingDebt > peakDebt) {
      peakDebt = record.closingDebt;
      peakMonth = record.month;
    }
  }

  const netReduction = initialDebt - currentDebt;

  return {
    initialDebt,
    currentDebt,
    peakDebt,
    peakMonth,
    totalPrincipalPaid: sum(ledger.map((r) => r.principalPaid)),
    totalInterestPaid: sum(ledger.map((r) => r.interestPaid)),
    totalNewBorrowing: sum(ledger.map((r) => r.newBorrowing)),
    netReduction,
    reductionRate: initialDebt > 0 ? netReduction / initialDebt : 0,
    firstMonth: trackingStart,
    lastMonth: ledger.length > 0 ? ledger[ledger.length - 1].month : null,
  };
}
