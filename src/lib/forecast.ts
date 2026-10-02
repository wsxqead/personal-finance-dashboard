import { cards as defaultCards } from "@/data/cards";
import { fixedExpenses as defaultFixedExpenses } from "@/data/fixed-expenses";
import { plan as defaultPlan } from "@/data/plan";
import { getExpectedCardTotal, getFixedExpenseTotal } from "@/lib/finance";
import type { Card, FinancePlan, FixedExpense, LoanPortfolio, MonthlyRecord, YearMonth } from "@/types/finance";

/**
 * 현재 계획을 그대로 유지한다고 가정한 미래 월별 예상치 (대시보드용).
 * 대출 상환액은 schedule.ts 의 대출별 스케줄 합계를, 수입·지출은 plan.ts 가정을 사용합니다.
 */
export function buildForecast(
  /** 마지막 실제 기록 기준 총 부채 (기록이 없으면 기록 시작 시점 잔액) */
  currentDebt: number,
  portfolio: LoanPortfolio,
  financePlan: FinancePlan = defaultPlan,
  cardList: Card[] = defaultCards,
  fixedItems: FixedExpense[] = defaultFixedExpenses,
): MonthlyRecord[] {
  const cardPayment = financePlan.monthlyCardPayment ?? getExpectedCardTotal(cardList);
  const { monthlyIncome, monthlyLivingExpenses } = financePlan;
  let openingDebt = currentDebt;

  return portfolio.schedule.slice(0, financePlan.horizonMonths).map((month) => {
    const fixedExpenses = getFixedExpenseTotal(month.month, fixedItems);
    const record: MonthlyRecord = {
      month: month.month,
      isForecast: true,
      income: monthlyIncome ?? 0,
      openingDebt,
      principalPaid: month.principal,
      interestPaid: month.interest,
      newBorrowing: month.borrowed,
      cardPayment,
      fixedExpenses,
      livingExpenses: monthlyLivingExpenses ?? 0,
      closingDebt: month.closingBalance,
      debtChange: month.closingBalance - openingDebt,
      loanPayment: month.payment,
      // 미입력 값이 있으면 화면에서 "계산할 수 없음"으로 표시 (isRecordComplete 참고)
      cashBalance:
        (monthlyIncome ?? 0) + month.borrowed - month.payment - cardPayment - fixedExpenses - (monthlyLivingExpenses ?? 0),
      loanBalances: month.loanBalances,
      loanPayments: Object.fromEntries(
        Object.entries(month.byLoan).map(([id, p]) => [id, { principal: p.principal, interest: p.interest }]),
      ),
      missing: {
        income: monthlyIncome === null,
        livingExpenses: monthlyLivingExpenses === null,
        loans: month.missingLoans,
        balance: !month.balanceKnown,
      },
    };
    openingDebt = month.closingBalance;
    return record;
  });
}

/** 예상 월의 현금 잔액을 계산할 수 있는지 (수입·생활비·대출 상환이 모두 입력됨) */
export function isCashflowComplete(record: MonthlyRecord): boolean {
  const m = record.missing;
  return !m || (!m.income && !m.livingExpenses && m.loans.length === 0);
}

export interface ForecastMilestone {
  monthsAhead: number;
  month: YearMonth;
  /** 예상 부채 (일정표 미입력으로 확정할 수 없으면 null) */
  debt: number | null;
  /** 현재 부채 대비 변화 (음수면 감소) */
  change: number | null;
}

export function getForecastMilestones(
  currentDebt: number,
  forecast: MonthlyRecord[],
  steps: number[] = [3, 6, 12],
): ForecastMilestone[] {
  return steps
    .filter((step) => step <= forecast.length)
    .map((step) => {
      const record = forecast[step - 1];
      return {
        monthsAhead: step,
        month: record.month,
        debt: record.missing?.balance ? null : record.closingDebt,
        change: record.missing?.balance ? null : record.closingDebt - currentDebt,
      };
    });
}
