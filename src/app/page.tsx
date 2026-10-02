import { DebtChart } from "@/components/dashboard/debt-chart";
import { DebtFlow } from "@/components/dashboard/debt-flow";
import { DebtSummary } from "@/components/dashboard/debt-summary";
import { FinanceEvents } from "@/components/dashboard/finance-events";
import { Forecast } from "@/components/dashboard/forecast";
import { LoanStatus } from "@/components/dashboard/loan-status";
import { MonthComparison } from "@/components/dashboard/month-comparison";
import { MonthlyCashflow } from "@/components/dashboard/monthly-cashflow";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { financeEvents } from "@/data/events";
import { formatMonth } from "@/lib/dates";
import { getFinanceOverview } from "@/lib/overview";
import { buildTimeline } from "@/lib/timeline";

export default function DashboardPage() {
  const { ledger, portfolio, forecast, summary, cardOutstanding, milestones, lastRecord, currentPlan } =
    getFinanceOverview();

  return (
    <>
      <PageHeader
        title="대시보드"
        description={
          summary.lastMonth
            ? `${formatMonth(summary.firstMonth)}부터 ${formatMonth(summary.lastMonth)}까지의 기록`
            : `${formatMonth(summary.firstMonth)}부터 기록을 시작합니다 · 아직 입력된 월별 기록이 없습니다`
        }
      />

      <div className="space-y-3 md:space-y-4">
        <DebtSummary summary={summary} currentPlan={currentPlan} portfolio={portfolio} cardOutstanding={cardOutstanding} />

        <div className="grid gap-3 md:gap-4 lg:grid-cols-3">
          <Card
            title="대출 잔액 추이"
            description="월말 기준 총 대출 잔액"
            className="min-w-0 lg:col-span-2"
          >
            <DebtChart points={buildTimeline(ledger, forecast, summary.initialDebt, summary.firstMonth)} />
          </Card>
          <DebtFlow summary={summary} />
        </div>

        {currentPlan && (
          <div className="grid gap-3 md:grid-cols-2 md:gap-4">
            <MonthlyCashflow record={currentPlan} />
            {lastRecord ? (
              <MonthComparison previous={lastRecord} current={currentPlan} />
            ) : (
              <Card title="지난달과 비교" description="지난달 실제 vs 이번 달 예상" className="h-full">
                <p className="text-sm text-muted">
                  아직 월별 기록이 없습니다. src/data/monthly-records.ts 에 첫 달 기록을 입력하면 지난달 실제와 이번
                  달 예상을 비교해 보여줍니다.
                </p>
              </Card>
            )}
          </div>
        )}

        <div className="grid gap-3 md:gap-4 lg:grid-cols-2">
          <LoanStatus projections={portfolio.projections} />
          <Forecast milestones={milestones} />
        </div>

        <FinanceEvents events={financeEvents} limit={5} />
      </div>
    </>
  );
}
