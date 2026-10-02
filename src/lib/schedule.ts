import { loans as defaultLoans } from "@/data/loans";
import { plan as defaultPlan } from "@/data/plan";
import { addMonths, formatMonth, monthDiff } from "@/lib/dates";
import {
  filled,
  getCurrentBalances,
  getCurrentMonth,
  getInitialBalance,
  getLoanStartMonth,
  sum,
  TRACKING_START_MONTH,
} from "@/lib/finance";
import type {
  FinancePlan,
  Loan,
  LoanPortfolio,
  LoanProjection,
  LoanScheduleRow,
  MonthlyRecord,
  PlannedRepayment,
  PortfolioMonth,
  ScheduleSource,
  YearMonth,
} from "@/types/finance";

/**
 * 대출 상환 스케줄 계산.
 *
 * 값의 우선순위 (같은 달에 여러 값이 있을 때)
 *
 *   manual (금융사 일정표가 진실의 원천)
 *     1. monthly-records.ts 의 실제 기록 → 2. 상환 일정표 → 3. 미입력 (추정하지 않음)
 *
 *   equal-payment / equal-principal / interest-only
 *     1. monthly-records.ts 의 실제 기록 → 2. 상환 일정표 (입력된 값만 덮어씀) → 3. 자동 계산
 *
 * 일정표의 null 은 "미입력", 0 은 "실제 0원"입니다.
 * manual 대출에서 일정표 첫 달보다 앞선 달은 납입이 없는 것으로 봅니다 (예: 다음 납부가 다음 달부터).
 * plan.ts 의 추가 상환은 2·3 위에 더해집니다.
 * 완납월은 원금이 미입력된 달 없이 잔액이 0원이 되는 달이 있을 때만 정해집니다.
 *
 * 예상 이자 = 월초 원금 × 연이율 ÷ 12 (원 단위 반올림).
 * 실제 금융사의 일할 계산, 납부일, 윤년, 중도상환 등과는 차이가 있을 수 있습니다.
 * 금리가 null(정보 없음)이면 이자를 추정하지 않고 "알 수 없음"으로 표시합니다.
 */

/** 시뮬레이션 최대 기간 (30년) */
const MAX_MONTHS = 360;
/** 완납 계획이 없는 대출도 최소한 이만큼은 예상표를 보여줍니다. */
const MIN_ROWS = 12;
/** 일정표 원금 합계가 잔액을 넘어도 허용하는 오차 (금융사 반올림): 1,000원 또는 잔액의 0.1% 중 큰 값 */
const scheduleTolerance = (balance: number) => Math.max(1_000, Math.round(balance * 0.001));

export function estimateInterest(balance: number, annualRate: number): number {
  return Math.round((balance * annualRate) / 100 / 12);
}

/**
 * 원리금균등 월 납입액
 *   P × r × (1+r)^n / ((1+r)^n − 1),  r = 연이율 / 12
 */
export function annuityPayment(principal: number, annualRate: number, months: number): number {
  if (months <= 1) return principal + estimateInterest(principal, annualRate);
  const r = annualRate / 100 / 12;
  if (r === 0) return Math.ceil(principal / months);
  const f = Math.pow(1 + r, months);
  return Math.round((principal * r * f) / (f - 1));
}

/** 계약상 만기 월 (미입력이면 undefined) */
export function getMaturityMonth(loan: Loan): YearMonth | undefined {
  return filled(loan.maturityMonth) ? loan.maturityMonth : undefined;
}

/** 1회차 납입 월 (미입력이면 undefined) */
export function getFirstPaymentMonth(loan: Loan): YearMonth | undefined {
  return filled(loan.firstPaymentMonth) ? loan.firstPaymentMonth : undefined;
}

/** 해당 월의 회차 (1회차 납입일과 총 회차를 알 때만) */
export function getInstallmentNumber(loan: Loan, month: YearMonth): number | undefined {
  const first = getFirstPaymentMonth(loan);
  if (!first || !loan.totalInstallments) return undefined;
  const n = monthDiff(first, month) + 1;
  return n >= 1 && n <= loan.totalInstallments ? n : undefined;
}

/**
 * 자동 계산 대출의 마지막 납입 월.
 * 1회차 납입일 + 총 회차가 있으면 그 기준, 없으면 계약 만기월.
 */
export function getFinalPaymentMonth(loan: Loan): YearMonth | undefined {
  const first = getFirstPaymentMonth(loan);
  if (first && loan.totalInstallments) return addMonths(first, loan.totalInstallments - 1);
  return getMaturityMonth(loan);
}

/** 해당 월을 포함해 마지막 납입 월까지 남은 납입 횟수 */
function remainingPayments(loan: Loan, month: YearMonth): number | undefined {
  const final = getFinalPaymentMonth(loan);
  return final ? Math.max(1, monthDiff(month, final) + 1) : undefined;
}

/** 대출 정의와 상환 일정표 검증 — 문제가 있으면 빌드가 실패합니다. */
export function validateLoan(loan: Loan) {
  const where = `loans.ts "${loan.id}"`;
  const hasMaturity = getMaturityMonth(loan) !== undefined;

  if (hasMaturity && !/^\d{4}-(0[1-9]|1[0-2])$/.test(loan.maturityMonth!)) {
    throw new Error(`${where}: maturityMonth 는 YYYY-MM 형식이어야 합니다 (예: "2029-05").`);
  }

  if (loan.interestRate !== null && (!Number.isFinite(loan.interestRate) || loan.interestRate < 0)) {
    throw new Error(`${where}: interestRate 는 0 이상의 숫자 또는 null(금리 정보 없음)이어야 합니다.`);
  }
  if (loan.interestRate === null && loan.repaymentType !== "manual") {
    throw new Error(`${where}: 금리 정보가 없으면(interestRate: null) 자동 계산을 할 수 없습니다. repaymentType 을 "manual" 로 두고 상환 일정표를 입력하세요.`);
  }
  for (const [field, value] of [
    ["firstPaymentMonth", loan.firstPaymentMonth],
    ["paidThroughMonth", loan.paidThroughMonth],
  ] as const) {
    if (filled(value) && !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
      throw new Error(`${where}: ${field} 는 YYYY-MM 형식이어야 합니다.`);
    }
  }
  if (loan.totalInstallments !== undefined && (!Number.isInteger(loan.totalInstallments) || loan.totalInstallments < 1)) {
    throw new Error(`${where}: totalInstallments(총 회차)는 1 이상의 정수여야 합니다.`);
  }
  const hasTerm = hasMaturity || (filled(loan.firstPaymentMonth) && !!loan.totalInstallments);
  if (loan.repaymentType === "equal-principal" && !loan.monthlyPrincipal && !hasTerm) {
    throw new Error(`${where}: 원금균등상환은 monthlyPrincipal, maturityMonth, 또는 firstPaymentMonth + totalInstallments 가 필요합니다.`);
  }
  if (loan.repaymentType === "equal-payment" && !loan.monthlyPayment && !hasTerm) {
    throw new Error(`${where}: 원리금균등상환은 monthlyPayment, maturityMonth, 또는 firstPaymentMonth + totalInstallments 가 필요합니다.`);
  }

  const schedule = loan.schedule ?? [];
  schedule.forEach((entry, index) => {
    const at = `${where} schedule ${entry.month}`;
    monthDiff(entry.month, entry.month); // YYYY-MM 형식 검사 (잘못되면 예외)
    if (index > 0) {
      const prev = schedule[index - 1].month;
      if (entry.month === prev) throw new Error(`${at}: 같은 달이 중복되었습니다.`);
      if (entry.month < prev) throw new Error(`${at}: 월 순서가 잘못되었습니다 (${prev} 다음에 ${entry.month}).`);
    }
    if (entry.principal !== null && (!Number.isFinite(entry.principal) || entry.principal < 0)) {
      throw new Error(`${at}: principal 은 0 이상의 숫자 또는 null(미입력)이어야 합니다.`);
    }
    if (entry.interest !== null && (!Number.isFinite(entry.interest) || entry.interest < 0)) {
      throw new Error(`${at}: interest 는 0 이상의 숫자 또는 null(미입력)이어야 합니다.`);
    }
    if (entry.installment !== undefined) {
      if (!Number.isInteger(entry.installment) || entry.installment < 1) {
        throw new Error(`${at}: installment(회차)는 1 이상의 정수여야 합니다.`);
      }
      const prevInstallment = index > 0 ? schedule[index - 1].installment : undefined;
      if (prevInstallment !== undefined && entry.installment <= prevInstallment) {
        throw new Error(`${at}: 회차가 이전 달(${prevInstallment}회차)보다 커야 합니다.`);
      }
    }
    if (entry.paymentDate !== undefined && filled(entry.paymentDate) && !/^\d{4}-\d{2}-\d{2}$/.test(entry.paymentDate)) {
      throw new Error(`${at}: paymentDate 는 YYYY-MM-DD 형식이어야 합니다.`);
    }
  });
}

/** 예상 구간의 일정표 원금 합계가 현재 잔액을 크게 넘지 않는지 (반올림 오차는 허용) */
function validateScheduleTotal(loan: Loan, fromMonth: YearMonth, balance: number) {
  const upcoming = (loan.schedule ?? []).filter((entry) => entry.month >= fromMonth);
  const total = sum(upcoming.map((entry) => entry.principal ?? 0));
  if (total > balance + scheduleTolerance(balance)) {
    throw new Error(
      `loans.ts "${loan.id}": ${fromMonth} 이후 상환 일정표의 원금 합계(${total.toLocaleString("ko-KR")}원)가 ` +
        `현재 잔액(${balance.toLocaleString("ko-KR")}원)보다 ${(total - balance).toLocaleString("ko-KR")}원 많습니다. 일정표나 openingBalance 를 확인하세요.`,
    );
  }
}

interface MonthPlan {
  principal: number;
  interest: number;
  source: ScheduleSource;
  interestEstimated: boolean;
  principalMissing: boolean;
  interestUnknown: boolean;
}

/** 상환 방식에 따른 자동 계산 (manual 이 아닌 대출) */
function autoMonth(loan: Loan, month: YearMonth, balance: number): { principal: number; interest: number } {
  // validateLoan 에서 manual 이 아닌 대출은 금리가 있음을 보장
  const rate = loan.interestRate ?? 0;
  const interest = estimateInterest(balance, rate);
  const remaining = remainingPayments(loan, month);
  let principal: number;
  switch (loan.repaymentType) {
    case "equal-principal":
      principal = loan.monthlyPrincipal ?? Math.ceil(balance / remaining!);
      break;
    case "equal-payment":
      principal = (loan.monthlyPayment ?? annuityPayment(balance, rate, remaining!)) - interest;
      break;
    case "interest-only":
    case "manual":
      principal = 0;
      break;
  }

  // 마지막 회차(또는 만기 월)에는 남은 원금을 모두 상환
  const final = getFinalPaymentMonth(loan);
  if (final && month >= final) principal = balance;

  return { principal: Math.min(balance, Math.max(0, principal)), interest };
}

/** 한 달의 정기 상환액 (추가 상환 제외) */
function planMonth(loan: Loan, month: YearMonth, balance: number): MonthPlan {
  const entry = loan.schedule?.find((e) => e.month === month);
  const principalEntered = entry !== undefined && entry.principal !== null;
  const interestEntered = entry !== undefined && entry.interest !== null;

  // manual: 일정표에 입력된 값만 사용, 없으면 미입력
  if (loan.repaymentType === "manual") {
    return {
      principal: principalEntered ? Math.min(balance, entry!.principal!) : 0,
      interest: interestEntered ? entry!.interest! : 0,
      source: "manual",
      interestEstimated: false,
      principalMissing: !principalEntered,
      interestUnknown: !interestEntered,
    };
  }

  // 자동 계산 대출: 일정표에 입력된 값만 자동 계산을 덮어씀
  const auto = autoMonth(loan, month, balance);
  return {
    principal: principalEntered ? Math.min(balance, entry!.principal!) : auto.principal,
    interest: interestEntered ? entry!.interest! : auto.interest,
    source: principalEntered || interestEntered ? "manual" : "auto",
    interestEstimated: !interestEntered,
    principalMissing: false,
    interestUnknown: false,
  };
}

/**
 * 일정표와 계약 만기월을 비교한 경고 (manual 대출).
 * 만기 연장이나 마지막 회차 조정이 있을 수 있으므로 빌드는 막지 않고 화면에만 알립니다.
 */
function getMaturityWarnings(loan: Loan, rows: LoanScheduleRow[]): string[] {
  const maturity = getMaturityMonth(loan);
  if (!maturity) return [];
  const warnings: string[] = [];
  const label = formatMonth(maturity);

  // 자동 계산 대출: 1회차 + 총 회차로 계산한 마지막 회차가 계약 만기를 넘는지
  if (loan.repaymentType !== "manual") {
    const first = getFirstPaymentMonth(loan);
    if (first && loan.totalInstallments) {
      const final = addMonths(first, loan.totalInstallments - 1);
      if (final > maturity) {
        warnings.push(
          `1회차(${formatMonth(first)})와 총 ${loan.totalInstallments}회로 계산한 마지막 회차(${formatMonth(final)})가 계약 만기(${label})보다 늦습니다. 회차나 만기월을 확인하세요.`,
        );
      }
    }
    return warnings;
  }

  const afterMaturity = (loan.schedule ?? []).filter((e) => e.month > maturity);
  if (afterMaturity.length > 0) {
    warnings.push(
      `상환 일정표에 계약 만기(${label}) 이후 달이 ${afterMaturity.length}개월 있습니다. 만기 연장 여부나 입력한 월을 확인하세요.`,
    );
  }

  // 만기월까지 일정표가 있고 금액이 모두 입력됐는데도 원금이 남는 경우
  const atMaturity = rows.find((row) => row.month === maturity);
  if (atMaturity && atMaturity.balanceKnown && atMaturity.closingBalance > scheduleTolerance(atMaturity.openingBalance)) {
    warnings.push(
      `계약 만기(${label})까지 상환 일정표를 따라도 원금 ${atMaturity.closingBalance.toLocaleString("ko-KR")}원이 남습니다. 마지막 회차 금액이나 만기 연장 여부를 확인하세요.`,
    );
  }
  return warnings;
}

/** 이후 달에 원금이 줄어들 근거(만기, 수동 스케줄, 추가 상환)가 남아 있는지 */
function hasFutureRepayment(loan: Loan, month: YearMonth, extras: PlannedRepayment[]): boolean {
  const final = getFinalPaymentMonth(loan);
  return (
    (final !== undefined && final > month) ||
    (loan.schedule ?? []).some((e) => e.month > month && (e.principal ?? 0) > 0) ||
    extras.some((e) => e.month > month && e.amount > 0)
  );
}

/** 실제 기록에서 대출 하나의 월별 이력을 뽑습니다. */
function buildHistory(loan: Loan, ledger: MonthlyRecord[]): LoanScheduleRow[] {
  const rows: LoanScheduleRow[] = [];
  const startMonth = getLoanStartMonth(loan);
  let cumulativePrincipal = 0;
  let cumulativeInterest = 0;

  for (const record of ledger) {
    if (!(loan.id in record.loanBalances)) continue;
    const payment = record.loanPayments[loan.id];
    const borrowed = (startMonth === record.month ? getInitialBalance(loan) : 0) + (payment?.borrowed ?? 0);
    const principal = payment?.principal ?? 0;
    const interest = payment?.interest ?? 0;
    const closingBalance = record.loanBalances[loan.id];
    const openingBalance = closingBalance + principal - borrowed;

    // 완납 이후의 빈 달은 건너뜀
    if (openingBalance <= 0 && closingBalance <= 0 && borrowed === 0 && principal === 0 && interest === 0) continue;

    cumulativePrincipal += principal;
    cumulativeInterest += interest;
    rows.push({
      month: record.month,
      kind: "actual",
      source: "record",
      interestEstimated: false,
      principalMissing: false,
      interestUnknown: false,
      balanceKnown: true,
      openingBalance,
      borrowed,
      principal,
      interest,
      payment: principal + interest,
      closingBalance,
      cumulativePrincipal,
      cumulativeInterest,
    });
  }
  return rows;
}

/** 대출 하나: 실제 이력 + 이번 달부터 완납까지의 예상 스케줄 */
export function projectLoan(
  loan: Loan,
  ledger: MonthlyRecord[],
  financePlan: FinancePlan = defaultPlan,
  currentBalances: Record<string, number> = getCurrentBalances(ledger),
  currentMonth: YearMonth = getCurrentMonth(ledger),
): LoanProjection {
  validateLoan(loan);

  const extras = financePlan.extraRepayments.filter((e) => e.loanId === loan.id);
  const history = buildHistory(loan, ledger);
  const isUpcoming = !(loan.id in currentBalances);

  const currentBalance = isUpcoming ? 0 : Math.max(0, currentBalances[loan.id]);
  const startMonth = getLoanStartMonth(loan);
  let balance = currentBalance;
  let month = isUpcoming && startMonth ? startMonth : currentMonth;
  let pendingBorrow = isUpcoming ? getInitialBalance(loan) : 0;
  const pendingBorrowAtStart = pendingBorrow;
  // 이미 납입한 달(paidThroughMonth)까지는 잔액에 반영되어 있으므로 그다음 달부터 계산
  if (!isUpcoming && filled(loan.paidThroughMonth) && addMonths(loan.paidThroughMonth, 1) > month) {
    month = addMonths(loan.paidThroughMonth, 1);
  }
  // 1회차 납입 월 이전에는 납입 없음 (예: 9월 실행, 11월 1회차)
  const firstPayment = getFirstPaymentMonth(loan);
  if (!isUpcoming && firstPayment && firstPayment > month) month = firstPayment;
  validateScheduleTotal(loan, month, currentBalance + pendingBorrow);

  const schedule: LoanScheduleRow[] = [];
  const isManual = loan.repaymentType === "manual";
  const scheduleStart = loan.schedule?.at(0)?.month;
  const scheduleEnd = loan.schedule?.at(-1)?.month;
  // manual 대출은 일정표 첫 달부터 (그 전 달은 납입 없음)
  if (isManual && !isUpcoming && scheduleStart && scheduleStart > month) month = scheduleStart;
  let cumulativePrincipal = 0;
  let cumulativeInterest = 0;
  let balanceKnown = true;

  while (schedule.length < MAX_MONTHS) {
    // manual 대출은 일정표가 끝난 뒤의 미래를 추정하지 않음
    if (isManual && (scheduleEnd === undefined || month > scheduleEnd)) break;

    const borrowed = pendingBorrow;
    pendingBorrow = 0;
    const openingBalance = balance + borrowed;
    if (openingBalance <= 0) break;

    const planned = planMonth(loan, month, openingBalance);
    const extra = sum(extras.filter((e) => e.month === month).map((e) => e.amount));
    const principal = Math.min(openingBalance, planned.principal + extra);
    const interest = planned.interest;
    const closingBalance = openingBalance - principal;
    if (planned.principalMissing) balanceKnown = false;

    cumulativePrincipal += principal;
    cumulativeInterest += interest;
    schedule.push({
      month,
      installment: loan.schedule?.find((e) => e.month === month)?.installment ?? getInstallmentNumber(loan, month),
      kind: "forecast",
      source: planned.source,
      interestEstimated: planned.interestEstimated,
      principalMissing: planned.principalMissing,
      interestUnknown: planned.interestUnknown,
      balanceKnown,
      openingBalance,
      borrowed,
      principal,
      interest,
      payment: principal + interest,
      closingBalance,
      cumulativePrincipal,
      cumulativeInterest,
    });

    balance = closingBalance;
    if (closingBalance <= 0) break;
    // 자동 계산에서 원금이 줄지 않고 앞으로도 줄어들 근거가 없으면, 최소 기간만 보여주고 멈춤
    if (!isManual && principal === 0 && !hasFutureRepayment(loan, month, extras) && schedule.length >= MIN_ROWS) break;
    month = addMonths(month, 1);
  }

  // 완납월: 원금 미입력 없이 잔액이 0원이 된 달 (일정표 마지막 달을 완납으로 보지 않음)
  const lastRow = schedule[schedule.length - 1];
  let payoffMonth: YearMonth | null = null;
  if (lastRow) {
    payoffMonth = lastRow.closingBalance <= 0 && lastRow.balanceKnown ? lastRow.month : null;
  } else if (currentBalance <= 0 && !isUpcoming) {
    // 이미 완납: 실제 기록에서 잔액이 0이 된 달
    payoffMonth = history.findLast((row) => row.closingBalance <= 0)?.month ?? null;
  }

  const warnings = getMaturityWarnings(loan, schedule);

  const progress =
    loan.originalAmount > 0 ? Math.min(1, Math.max(0, (loan.originalAmount - currentBalance) / loan.originalAmount)) : 0;

  return {
    loan,
    state: isUpcoming ? "upcoming" : currentBalance <= 0 ? "paid-off" : "active",
    openingBalance: getInitialBalance(loan),
    currentBalance,
    progress: isUpcoming ? 0 : progress,
    history,
    schedule,
    currentMonth,
    thisMonth: schedule.find((row) => row.month === currentMonth),
    nextDue: schedule[0],
    nextMonth: schedule.find((row) => row.month === addMonths(currentMonth, 1)),
    payoffMonth,
    remainingInterest: sum(schedule.map((row) => row.interest)),
    interestIncomplete:
      currentBalance + pendingBorrowAtStart > 0 &&
      (payoffMonth === null || schedule.some((row) => row.principalMissing || row.interestUnknown)),
    hasSchedule: (loan.schedule ?? []).length > 0,
    autoFromMonth:
      !isManual && (loan.schedule ?? []).length > 0
        ? (schedule.find((row) => row.source === "auto")?.month ?? null)
        : null,
    missingMonths: schedule.filter((row) => row.principalMissing || row.interestUnknown).length,
    warnings,
  };
}

function toPortfolioMonth(
  month: YearMonth,
  kind: PortfolioMonth["kind"],
  rows: { loanId: string; row: LoanScheduleRow }[],
  loanBalances: Record<string, number>,
  missingLoans: string[] = [],
  balanceKnown = true,
): PortfolioMonth {
  const byLoan: PortfolioMonth["byLoan"] = {};
  for (const { loanId, row } of rows) {
    if (row.payment > 0) byLoan[loanId] = { principal: row.principal, interest: row.interest, payment: row.payment };
  }
  const principal = sum(rows.map(({ row }) => row.principal));
  const interest = sum(rows.map(({ row }) => row.interest));
  return {
    month,
    kind,
    principal,
    interest,
    payment: principal + interest,
    borrowed: sum(rows.map(({ row }) => row.borrowed)),
    closingBalance: sum(Object.values(loanBalances)),
    loanBalances: { ...loanBalances },
    byLoan,
    missingLoans,
    balanceKnown,
  };
}

/** 모든 대출의 이력과 예상 스케줄을 월별로 합산 */
export function projectLoans(
  ledger: MonthlyRecord[],
  loanList: Loan[] = defaultLoans,
  financePlan: FinancePlan = defaultPlan,
  trackingStart: YearMonth = TRACKING_START_MONTH,
): LoanPortfolio {
  const loanIds = new Set(loanList.map((loan) => loan.id));
  for (const extra of financePlan.extraRepayments) {
    if (!loanIds.has(extra.loanId)) throw new Error(`plan.ts: 알 수 없는 대출 ID "${extra.loanId}"`);
  }

  const currentBalances = getCurrentBalances(ledger, loanList, trackingStart);
  const currentMonth = getCurrentMonth(ledger, trackingStart);
  const projections = loanList.map((loan) => projectLoan(loan, ledger, financePlan, currentBalances, currentMonth));

  // 실제 기록 월
  const history = ledger.map((record) =>
    toPortfolioMonth(
      record.month,
      "actual",
      projections.flatMap((p) => {
        const row = p.history.find((r) => r.month === record.month);
        return row ? [{ loanId: p.loan.id, row }] : [];
      }),
      record.loanBalances,
    ),
  );

  // 이번 달부터: 마지막 예상 행 또는 표시 기간 중 늦은 달까지
  const lastScheduled = projections
    .flatMap((p) => p.schedule.map((row) => row.month))
    .reduce((latest, month) => (month > latest ? month : latest), currentMonth);
  const horizonEnd = addMonths(currentMonth, Math.max(1, financePlan.horizonMonths) - 1);
  const endMonth = lastScheduled > horizonEnd ? lastScheduled : horizonEnd;

  const balances: Record<string, number> = { ...currentBalances };
  const rowMaps = projections.map((p) => ({ id: p.loan.id, rows: new Map(p.schedule.map((r) => [r.month, r])) }));
  const schedule: PortfolioMonth[] = [];

  const known: Record<string, boolean> = Object.fromEntries(Object.keys(balances).map((id) => [id, true]));
  const firstRowMonth = new Map(projections.map((p) => [p.loan.id, p.schedule[0]?.month]));

  for (let month = currentMonth; month <= endMonth; month = addMonths(month, 1)) {
    const rows: { loanId: string; row: LoanScheduleRow }[] = [];
    const missingLoans: string[] = [];
    for (const { id, rows: map } of rowMaps) {
      const row = map.get(month);
      if (!row) {
        // 첫 예상 행보다 앞선 달은 납입 없음 (예: 일정표가 다음 달부터 시작)
        const firstRow = firstRowMonth.get(id);
        if (firstRow && month < firstRow) continue;
        // 잔액이 남았는데 이 달 상환 정보가 없음 (일정표 종료 또는 미입력)
        if ((balances[id] ?? 0) > 0) {
          missingLoans.push(id);
          known[id] = false;
        }
        continue;
      }
      balances[id] = row.closingBalance;
      known[id] = row.balanceKnown;
      rows.push({ loanId: id, row });
      if (row.principalMissing || row.interestUnknown) missingLoans.push(id);
    }
    const balanceKnown = Object.values(known).every(Boolean);
    schedule.push(toPortfolioMonth(month, "forecast", rows, balances, missingLoans, balanceKnown));
  }

  const unresolved = projections.filter((p) => p.state !== "paid-off" && p.payoffMonth === null).map((p) => p.loan);
  const remainingPrincipal = sum(projections.map((p) => p.currentBalance));
  const remainingInterest = sum(projections.map((p) => p.remainingInterest));
  const payoffMonths = projections.map((p) => p.payoffMonth).filter((m): m is YearMonth => m !== null);

  return {
    projections,
    history,
    schedule,
    currentMonth,
    remainingPrincipal,
    remainingInterest,
    totalRepayment: remainingPrincipal + remainingInterest,
    payoffMonth: unresolved.length > 0 || payoffMonths.length === 0 ? null : payoffMonths.sort().at(-1)!,
    unresolved,
    hasVariableRate: projections.some((p) => p.state !== "paid-off" && p.loan.variableRate),
    interestIncomplete: projections.some((p) => p.interestIncomplete),
    blankSchedules: projections
      .filter(
        (p) => p.state !== "paid-off" && (p.missingMonths > 0 || (p.loan.repaymentType === "manual" && !p.nextDue)),
      )
      .map((p) => p.loan),
  };
}

/** 이 달의 원금 또는 이자가 아직 입력되지 않았는지 (행이 없으면 true) */
export function isRowMissing(row: LoanScheduleRow | undefined): boolean {
  return !row || row.principalMissing || row.interestUnknown;
}

/**
 * 이번 달 상환 정보가 비어 있는지.
 * 일정표가 다음 달부터 시작하는 경우(이번 달 납입 없음)는 미입력이 아닙니다.
 */
export function isThisMonthMissing(projection: LoanProjection): boolean {
  if (projection.state !== "active") return false;
  if (projection.thisMonth) return isRowMissing(projection.thisMonth);
  const next = projection.nextDue;
  return !next || next.month <= projection.currentMonth;
}
