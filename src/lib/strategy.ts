import { addMonths, monthDiff } from "@/lib/dates";
import { sum } from "@/lib/finance";
import { estimateInterest, projectLoan } from "@/lib/schedule";
import type { FinancePlan, Loan, LoanProjection, YearMonth } from "@/types/finance";

/**
 * 추가 상환 전략 시뮬레이터.
 * 특정 금액을 지금 한 대출에 추가 상환한다고 가정하고, 대출별 결과를 비교합니다.
 * 어떤 대출을 갚아야 한다고 추천하지 않고, 계산 결과만 나란히 보여주기 위한 순수 함수들입니다.
 *
 * - 자동 계산 대출: 기존 스케줄 계산기(projectLoan)에 줄어든 잔액을 넣어 다시 계산
 * - manual 대출: 금융사 일정표가 완납까지 입력된 경우에만, 일정표 납입액을 기준으로 추정
 */

/** 추가 상환 후 처리 방식 (금융사마다 다름) */
export type PrepayMode =
  | "shorten-term" // 월 납입 유지, 완납 앞당김
  | "reduce-payment"; // 만기 유지, 월 납입 감소

export type StrategyStatus = "ok" | "incomplete" | "inactive" | "error";

export interface PrepaymentFee {
  /** 수수료 정보가 입력되어 있는지 */
  known: boolean;
  /** 확인된 값이 아니라 가정값인지 */
  assumed: boolean;
  rate?: number;
  endMonth?: YearMonth;
  /** 이번 추가 상환에 수수료가 붙는지 (면제 기간이 지났으면 false) */
  applies: boolean;
  amount: number;
}

interface PaymentRow {
  month: YearMonth;
  payment: number;
  interest: number;
}

export interface LoanStrategyResult {
  loan: Loan;
  status: StrategyStatus;
  /** status 가 ok 가 아닐 때 이유 */
  reason?: string;
  /** manual 일정표를 바탕으로 추정한 값인지 */
  estimated: boolean;
  currentBalance: number;
  /** 실제로 넣을 수 있는 금액 (잔액보다 많으면 잔액까지) */
  applied: number;
  /** 잔액을 넘어 남는 금액 */
  leftover: number;
  balanceAfter: number;
  basePayoff: YearMonth | null;
  newPayoff: YearMonth | null;
  /** 추가 상환으로 바로 완납 */
  paidOffNow: boolean;
  /** 납입 횟수 기준 단축 개월 수 */
  monthsSaved: number;
  baseInterest: number;
  newInterest: number;
  interestSaved: number;
  fee: PrepaymentFee;
  /** 이자 절감 − 중도상환수수료 (수수료 정보가 없으면 이자 절감과 같음) */
  netSaving: number;
  /** 다음 납입 월과 그 달의 기존/변경 후 납입액 */
  paymentMonth?: YearMonth;
  basePayment: number;
  newPayment: number;
  /** 앞으로 24개월 동안 줄어드는 납입액 합계 */
  relief24: number;
  /** 월 납입이 줄어들기(또는 사라지기) 시작하는 월 */
  reliefStartMonth: YearMonth | null;
  /** 그때부터 줄어드는 월 납입액 */
  reliefAmount: number;
  baseRows: PaymentRow[];
  newRows: PaymentRow[];
}

/** 월 부담 비교에 쓰는 기간 (개월) */
export const RELIEF_WINDOW = 24;

export interface StrategyContext {
  currentMonth: YearMonth;
  currentBalances: Record<string, number>;
  plan: FinancePlan;
}

function getPrepaymentFee(loan: Loan, applied: number, month: YearMonth): PrepaymentFee {
  if (loan.prepaymentFeeRate === undefined) return { known: false, assumed: false, applies: false, amount: 0 };
  const endMonth = loan.prepaymentFeeEndMonth;
  const applies = !endMonth || month <= endMonth;
  return {
    known: true,
    assumed: loan.prepaymentFeeAssumed === true,
    rate: loan.prepaymentFeeRate,
    endMonth,
    applies,
    amount: applies ? Math.round((applied * loan.prepaymentFeeRate) / 100) : 0,
  };
}

const paymentMonths = (rows: PaymentRow[]) => rows.filter((row) => row.payment > 0).length;

/** 일정표 납입액을 그대로 내면서 이자를 금리로 다시 계산 (manual 기간 단축 추정용) */
function modelFixedPayments(rows: PaymentRow[], startBalance: number, rate: number): PaymentRow[] {
  const out: PaymentRow[] = [];
  let balance = startBalance;
  for (const row of rows) {
    if (balance <= 0) break;
    const interest = estimateInterest(balance, rate);
    const principal = Math.min(balance, Math.max(0, row.payment - interest));
    out.push({ month: row.month, payment: principal + interest, interest });
    balance -= principal;
  }
  // 반올림 등으로 마지막에 남은 원금은 마지막 달에 함께 상환
  if (balance > 0 && out.length > 0) out[out.length - 1].payment += balance;
  return out;
}

function inactiveResult(projection: LoanProjection, amount: number, ctx: StrategyContext): LoanStrategyResult {
  return {
    loan: projection.loan,
    status: "inactive",
    reason: "완납되었거나 아직 실행 전인 대출입니다.",
    estimated: false,
    currentBalance: projection.currentBalance,
    applied: 0,
    leftover: amount,
    balanceAfter: projection.currentBalance,
    basePayoff: projection.payoffMonth,
    newPayoff: projection.payoffMonth,
    paidOffNow: false,
    monthsSaved: 0,
    baseInterest: 0,
    newInterest: 0,
    interestSaved: 0,
    fee: getPrepaymentFee(projection.loan, 0, ctx.currentMonth),
    netSaving: 0,
    basePayment: 0,
    newPayment: 0,
    relief24: 0,
    reliefStartMonth: null,
    reliefAmount: 0,
    baseRows: [],
    newRows: [],
  };
}

/** 한 대출에 추가 상환액을 전부 넣었을 때의 결과 */
export function simulatePrepayment(
  projection: LoanProjection,
  amount: number,
  mode: PrepayMode,
  ctx: StrategyContext,
): LoanStrategyResult {
  const { loan, currentBalance } = projection;
  if (projection.state !== "active" || currentBalance <= 0) return inactiveResult(projection, amount, ctx);

  const applied = Math.max(0, Math.min(amount, currentBalance));
  const balanceAfter = currentBalance - applied;
  const fee = getPrepaymentFee(loan, applied, ctx.currentMonth);
  const baseRows: PaymentRow[] = projection.schedule.map((r) => ({ month: r.month, payment: r.payment, interest: r.interest }));
  const base = {
    loan,
    estimated: false,
    currentBalance,
    applied,
    leftover: amount - applied,
    balanceAfter,
    basePayoff: projection.payoffMonth,
    baseInterest: projection.remainingInterest,
    fee,
    paymentMonth: projection.nextDue?.month,
    basePayment: projection.nextDue?.payment ?? 0,
    baseRows,
  };

  const incomplete = (reason: string): LoanStrategyResult => ({
    ...base,
    status: "incomplete",
    reason,
    newPayoff: null,
    paidOffNow: false,
    monthsSaved: 0,
    newInterest: 0,
    interestSaved: 0,
    netSaving: 0,
    newPayment: 0,
    relief24: 0,
    reliefStartMonth: null,
    reliefAmount: 0,
    newRows: [],
  });

  // 완납까지의 계산이 확정되지 않은 대출은 효과를 확정적으로 계산하지 않음
  if (projection.interestIncomplete || projection.payoffMonth === null) {
    return incomplete(
      loan.repaymentType === "manual" ? "일정표 미완성으로 정확한 계산 불가" : "완납 시점을 알 수 없어 정확한 계산 불가",
    );
  }

  let newRows: PaymentRow[];
  let newInterest: number;
  let monthsSaved: number;
  let estimated = false;

  if (balanceAfter <= 0) {
    // 추가 상환으로 바로 완납
    newRows = [];
    newInterest = 0;
    monthsSaved = paymentMonths(baseRows);
  } else if (loan.repaymentType === "manual") {
    estimated = true;
    if (mode === "reduce-payment") {
      // 만기 유지: 남은 회차의 원금·이자가 잔액 비율만큼 줄어든다고 추정
      const ratio = balanceAfter / currentBalance;
      newRows = baseRows.map((r) => ({
        month: r.month,
        payment: Math.round(r.payment * ratio),
        interest: Math.round(r.interest * ratio),
      }));
      newInterest = sum(newRows.map((r) => r.interest));
      monthsSaved = 0;
    } else {
      if (loan.interestRate === null) return incomplete("금리 정보가 없어 기간 단축 효과를 계산할 수 없음");
      // 기간 단축: 일정표 납입액을 유지한다고 보고, 같은 방식으로 기존/변경 후를 계산해 차이만 반영
      const baseModel = modelFixedPayments(baseRows, currentBalance, loan.interestRate);
      const newModel = modelFixedPayments(baseRows, balanceAfter, loan.interestRate);
      const saving = sum(baseModel.map((r) => r.interest)) - sum(newModel.map((r) => r.interest));
      newInterest = Math.max(0, projection.remainingInterest - saving);
      monthsSaved = paymentMonths(baseModel) - paymentMonths(newModel);
      newRows = newModel;
    }
  } else {
    // 자동 계산 대출: 기존 계산기에 줄어든 잔액을 넣어 다시 계산
    const modified: Loan = { ...loan };
    if (mode === "shorten-term") {
      // 월 납입(원금)을 지금 수준으로 고정해 기간이 줄어들게 함
      if (loan.repaymentType === "equal-payment") modified.monthlyPayment = projection.nextDue?.payment;
      if (loan.repaymentType === "equal-principal") modified.monthlyPrincipal = projection.nextDue?.principal;
    } else if (
      loan.repaymentType === "equal-payment" &&
      (loan.maturityMonth || (loan.firstPaymentMonth && loan.totalInstallments))
    ) {
      // 만기 유지: 고정 월 납입액이 있더라도 남은 기간으로 월 납입을 다시 계산
      modified.monthlyPayment = undefined;
    }
    try {
      const after = projectLoan(
        modified,
        [],
        ctx.plan,
        { ...ctx.currentBalances, [loan.id]: balanceAfter },
        ctx.currentMonth,
      );
      newRows = after.schedule.map((r) => ({ month: r.month, payment: r.payment, interest: r.interest }));
      newInterest = after.remainingInterest;
      monthsSaved = paymentMonths(baseRows) - paymentMonths(newRows);
    } catch (error) {
      return { ...incomplete((error as Error).message), status: "error" };
    }
  }

  const newPayoff = newRows.length > 0 ? newRows.filter((r) => r.payment > 0).at(-1)?.month ?? null : null;
  const interestSaved = Math.max(0, base.baseInterest - newInterest);
  const paymentMonth = base.paymentMonth;
  const newPayment = paymentMonth ? (newRows.find((r) => r.month === paymentMonth)?.payment ?? 0) : 0;

  // 앞으로 24개월 동안 줄어드는 납입액
  const baseByMonth = new Map(baseRows.map((r) => [r.month, r.payment]));
  const newByMonth = new Map(newRows.map((r) => [r.month, r.payment]));
  let relief24 = 0;
  for (let i = 0; i < RELIEF_WINDOW; i++) {
    const month = addMonths(ctx.currentMonth, i);
    relief24 += (baseByMonth.get(month) ?? 0) - (newByMonth.get(month) ?? 0);
  }

  // 월 납입이 줄어드는 시점과 금액
  let reliefStartMonth: YearMonth | null = null;
  let reliefAmount = 0;
  if (balanceAfter <= 0) {
    reliefStartMonth = paymentMonth ?? null;
    reliefAmount = base.basePayment;
  } else if (mode === "reduce-payment") {
    reliefStartMonth = paymentMonth ?? null;
    reliefAmount = Math.max(0, base.basePayment - newPayment);
  } else if (newPayoff && monthsSaved > 0) {
    reliefStartMonth = addMonths(newPayoff, 1);
    reliefAmount = baseByMonth.get(reliefStartMonth) ?? base.basePayment;
  }

  return {
    ...base,
    status: "ok",
    estimated,
    newPayoff,
    paidOffNow: balanceAfter <= 0,
    monthsSaved: Math.max(0, monthsSaved),
    newInterest,
    interestSaved,
    netSaving: interestSaved - fee.amount,
    newPayment,
    relief24: Math.max(0, relief24),
    reliefStartMonth: reliefAmount > 0 ? reliefStartMonth : null,
    reliefAmount,
    newRows,
  };
}

export type StrategyView = "interest" | "burden" | "term" | "balanced";

export interface BalancedScore {
  interest: number;
  term: number;
  burden: number;
  /** 세 지표(0~1)의 평균 × 100 — 비교용 지수일 뿐 추천이 아님 */
  index: number;
}

/** 균형 비교: 각 지표를 후보 중 최댓값 대비 비율로 바꿔 평균 */
export function getBalancedScores(results: LoanStrategyResult[]): Map<string, BalancedScore> {
  const ok = results.filter((r) => r.status === "ok");
  const max = (pick: (r: LoanStrategyResult) => number) => Math.max(0, ...ok.map(pick));
  const maxInterest = max((r) => r.netSaving);
  const maxTerm = max((r) => r.monthsSaved);
  const maxBurden = max((r) => r.relief24);
  const ratio = (value: number, top: number) => (top > 0 ? Math.max(0, value) / top : 0);

  return new Map(
    ok.map((r) => {
      const interest = ratio(r.netSaving, maxInterest);
      const term = ratio(r.monthsSaved, maxTerm);
      const burden = ratio(r.relief24, maxBurden);
      return [r.loan.id, { interest, term, burden, index: Math.round(((interest + term + burden) / 3) * 100) }];
    }),
  );
}

function currentMonthOf(results: LoanStrategyResult[]): YearMonth {
  return results.map((r) => r.paymentMonth).filter((m): m is YearMonth => !!m).sort()[0] ?? "2000-01";
}

/** 관점별 정렬 (계산할 수 없는 대출은 항상 뒤로) */
export function sortStrategies(results: LoanStrategyResult[], view: StrategyView): LoanStrategyResult[] {
  const scores = getBalancedScores(results);
  const key = (r: LoanStrategyResult): number[] => {
    switch (view) {
      case "interest":
        return [r.netSaving, r.monthsSaved];
      case "burden":
        // 월 납입이 더 빨리 줄어들수록, 같은 시점이면 더 많이 줄어들수록 앞
        return [r.reliefStartMonth ? -monthDiff(currentMonthOf(results), r.reliefStartMonth) : -1e9, r.reliefAmount];
      case "term":
        return [r.monthsSaved, r.netSaving];
      case "balanced":
        return [scores.get(r.loan.id)?.index ?? 0, r.netSaving];
    }
  };
  const rank = (r: LoanStrategyResult) => (r.status === "ok" ? 0 : r.status === "incomplete" ? 1 : 2);
  return [...results].sort((a, b) => {
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    const ka = key(a);
    const kb = key(b);
    return kb[0] - ka[0] || kb[1] - ka[1];
  });
}

/** 전체 대출 기준 비교에 필요한 값 (서버에서 계산해 전달) */
export interface PortfolioBaseline {
  remainingPrincipal: number;
  remainingInterest: number;
  interestIncomplete: boolean;
  payoffMonth: YearMonth | null;
  /** 대출별 예상 완납월 */
  payoffs: Record<string, YearMonth | null>;
  /** 월 → 전체 납입액 */
  monthlyPayments: Record<YearMonth, number>;
}

export interface PortfolioEffect {
  remainingPrincipal: number;
  /** 전체 잔여 이자 (기존이 확정되지 않았으면 null) */
  remainingInterest: number | null;
  interestSaved: number;
  payoffMonth: YearMonth | null;
  /** 전체 완납 단축 개월 수 (계산할 수 없으면 null) */
  monthsShortened: number | null;
  paymentMonth?: YearMonth;
  basePayment?: number;
  newPayment?: number;
  relief24: number;
  fee: PrepaymentFee;
  netSaving: number;
}

/** 선택한 전략을 전체 대출에 적용했을 때 */
export function applyToPortfolio(baseline: PortfolioBaseline, result: LoanStrategyResult): PortfolioEffect {
  const payoffs = { ...baseline.payoffs, [result.loan.id]: result.paidOffNow ? null : result.newPayoff };
  const known = Object.entries(payoffs).filter(([, m]) => m !== null) as [string, YearMonth][];
  const allKnown = baseline.payoffMonth !== null && result.status === "ok";
  const payoffMonth = allKnown && known.length > 0 ? known.map(([, m]) => m).sort().at(-1)! : null;
  const monthsShortened =
    allKnown && baseline.payoffMonth && payoffMonth ? Math.max(0, monthDiff(payoffMonth, baseline.payoffMonth)) : null;

  const month = result.paymentMonth;
  const basePayment = month ? baseline.monthlyPayments[month] : undefined;

  return {
    remainingPrincipal: baseline.remainingPrincipal - result.applied,
    remainingInterest: baseline.interestIncomplete ? null : baseline.remainingInterest - result.interestSaved,
    interestSaved: result.interestSaved,
    payoffMonth,
    monthsShortened,
    paymentMonth: month,
    basePayment,
    newPayment: basePayment !== undefined ? basePayment - (result.basePayment - result.newPayment) : undefined,
    relief24: result.relief24,
    fee: result.fee,
    netSaving: result.netSaving,
  };
}
