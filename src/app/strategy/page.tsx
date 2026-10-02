import type { Metadata } from "next";
import { StrategySimulator } from "@/components/strategy/strategy-simulator";
import { PageHeader } from "@/components/ui/page-header";
import { plan } from "@/data/plan";
import { getCurrentBalances } from "@/lib/finance";
import { getFinanceOverview } from "@/lib/overview";
import type { PortfolioBaseline } from "@/lib/strategy";

export const metadata: Metadata = { title: "상환 전략" };

export default function StrategyPage() {
  const { ledger, portfolio } = getFinanceOverview();

  const baseline: PortfolioBaseline = {
    remainingPrincipal: portfolio.remainingPrincipal,
    remainingInterest: portfolio.remainingInterest,
    interestIncomplete: portfolio.interestIncomplete,
    payoffMonth: portfolio.payoffMonth,
    payoffs: Object.fromEntries(
      portfolio.projections.filter((p) => p.state === "active").map((p) => [p.loan.id, p.payoffMonth]),
    ),
    monthlyPayments: Object.fromEntries(portfolio.schedule.map((m) => [m.month, m.payment])),
  };

  return (
    <>
      <PageHeader
        title="상환 전략"
        description="여유자금을 한 대출에 추가 상환한다고 가정하고, 대출별 결과를 비교합니다."
      />
      <StrategySimulator
        projections={portfolio.projections}
        currentMonth={portfolio.currentMonth}
        currentBalances={getCurrentBalances(ledger)}
        plan={plan}
        baseline={baseline}
      />
    </>
  );
}
