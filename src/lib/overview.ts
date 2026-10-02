import { buildLedger, getCardOutstandingTotal, getDebtSummary } from "@/lib/finance";
import { buildForecast, getForecastMilestones } from "@/lib/forecast";
import { projectLoans } from "@/lib/schedule";

/** 여러 페이지에서 공통으로 쓰는 계산 결과 묶음 (빌드 시점에 계산) */
export function getFinanceOverview() {
  const ledger = buildLedger();
  const summary = getDebtSummary(ledger);
  const portfolio = projectLoans(ledger);
  const forecast = buildForecast(summary.currentDebt, portfolio);
  return {
    ledger,
    portfolio,
    forecast,
    summary,
    /** 카드 미결제 금액 (대출과 별도, 총 금융부담에만 포함) */
    cardOutstanding: getCardOutstandingTotal(),
    milestones: getForecastMilestones(summary.currentDebt, forecast),
    /** 지난달 = 마지막 실제 기록 (월별 기록이 없으면 undefined) */
    lastRecord: ledger.at(-1),
    /** 이번 달 = 첫 예상 월 */
    currentPlan: forecast.at(0),
  };
}
