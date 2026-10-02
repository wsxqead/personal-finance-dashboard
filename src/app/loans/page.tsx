import type { Metadata } from "next";
import Link from "next/link";
import { LoanCard } from "@/components/loans/loan-card";
import { LoanOverview } from "@/components/loans/loan-overview";
import { PaymentBreakdown } from "@/components/loans/payment-breakdown";
import { RepaymentChart } from "@/components/loans/repayment-chart";
import { ScheduleTable } from "@/components/loans/schedule-table";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { formatMonth } from "@/lib/dates";
import { INTEREST_NOTE } from "@/lib/labels";
import { getFinanceOverview } from "@/lib/overview";
import { buildRepaymentBars } from "@/lib/timeline";

export const metadata: Metadata = { title: "대출" };

/** 표·차트에 함께 보여줄 최근 실제 기록 개월 수 */
const RECENT_ACTUAL_TABLE = 3;
const RECENT_ACTUAL_CHART = 6;

export default function LoansPage() {
  const { portfolio } = getFinanceOverview();
  const { projections, history, currentMonth } = portfolio;

  // 모든 대출을 다 갚은 뒤의 빈 달만 제외 (일정표 미입력으로 0원인 달은 그대로 표시)
  const schedule = portfolio.schedule.filter((m) => m.payment > 0 || m.closingBalance > 0);
  const thisMonth = portfolio.schedule[0];
  const toRow = (m: (typeof history)[number]) => ({
    month: m.month,
    kind: m.kind,
    borrowed: m.borrowed,
    principal: m.principal,
    interest: m.interest,
    payment: m.payment,
    closingBalance: m.closingBalance,
    balance: m.closingBalance,
    balanceKnown: m.balanceKnown,
    missingCount: m.missingLoans.length,
  });

  const chartBars = buildRepaymentBars([...history.slice(-RECENT_ACTUAL_CHART), ...schedule].map(toRow));
  const hasAutoLoans = projections.some((p) => p.state === "active" && p.loan.repaymentType !== "manual");

  const sorted = [...projections].sort(
    (a, b) =>
      Number(a.state === "paid-off") - Number(b.state === "paid-off") || b.currentBalance - a.currentBalance,
  );

  return (
    <>
      <PageHeader
        title="대출"
        description="남은 원금, 이번 달 납입, 완납까지의 상환 계획. 데이터는 src/data/loans.ts 에서 수정합니다."
      />

      <div className="space-y-3 md:space-y-4">
        <LoanOverview portfolio={portfolio} />

        {projections.some((p) => p.warnings.length > 0) && (
          <div className="rounded-2xl border border-increase/40 bg-increase-soft px-5 py-4 text-sm md:px-6">
            <p className="font-medium">계약 만기와 일정표 확인 필요</p>
            <ul className="mt-1.5 space-y-1 text-[13px]">
              {projections
                .filter((p) => p.warnings.length > 0)
                .flatMap((p) =>
                  p.warnings.map((warning) => (
                    <li key={`${p.loan.id}-${warning}`}>
                      <Link href={`/loans/${p.loan.id}`} className="font-medium underline-offset-2 hover:underline">
                        {p.loan.name}
                      </Link>{" "}
                      · {warning}
                    </li>
                  )),
                )}
            </ul>
          </div>
        )}

        {portfolio.blankSchedules.length > 0 && (
          <div className="rounded-2xl border border-dashed bg-surface px-5 py-4 text-sm md:px-6">
            <p className="font-medium">상환 일정표 미입력 대출 {portfolio.blankSchedules.length}건</p>
            <p className="mt-1 text-muted">
              상환 일정표에 아직 금액을 적지 않은 달(null)이 있거나 일정표가 비어 있는 대출입니다. 금융사 일정표 금액을
              src/data/schedules/ 의 각 파일에 입력하면 이번 달 납입, 이자, 완납월이 계산됩니다.
            </p>
            <p className="mt-2 text-xs text-muted">{portfolio.blankSchedules.map((loan) => loan.name).join(" · ")}</p>
          </div>
        )}

        <section aria-labelledby="loan-list-title">
          <h2 id="loan-list-title" className="mt-4 mb-3 text-[15px] font-semibold tracking-tight md:mt-6">
            대출별 현황 <span className="ml-1 text-xs font-normal text-muted">카드를 누르면 상세 상환 흐름을 볼 수 있습니다</span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 md:gap-4 xl:grid-cols-3">
            {sorted.map((projection) => (
              <LoanCard key={projection.loan.id} projection={projection} />
            ))}
          </div>
        </section>

        <div className="grid gap-3 pt-2 md:gap-4 lg:grid-cols-5">
          {thisMonth && (
            <div className="lg:col-span-2">
              <PaymentBreakdown month={thisMonth} loans={projections.map((p) => p.loan)} />
            </div>
          )}
          <Card
            title="월별 납입 추이"
            description="모든 대출의 원금 + 이자 합계"
            className="min-w-0 lg:col-span-3"
          >
            {chartBars.some((bar) => bar.principal + bar.interest > 0) ? (
              <RepaymentChart bars={chartBars} />
            ) : (
              <p className="py-10 text-center text-sm text-muted">
                아직 표시할 납입 금액이 없습니다. 상환 일정표나 월별 기록을 입력하면 그래프가 그려집니다.
              </p>
            )}
          </Card>
        </div>

        <Card
          title="전체 월별 상환 계획"
          description={
            history.length > 0
              ? `최근 ${RECENT_ACTUAL_TABLE}개월 실제 기록과, ${formatMonth(currentMonth)}부터 모든 대출 완납까지의 예상`
              : `${formatMonth(currentMonth)}부터의 예상 (실제 기록이 쌓이면 위쪽에 함께 표시됩니다)`
          }
        >
          <ScheduleTable
            caption="전체 대출 월별 상환 계획"
            closingLabel="남은 총 원금"
            rows={[...history.slice(-RECENT_ACTUAL_TABLE), ...schedule].map(toRow)}
          />
          <p className="mt-4 text-[11px] leading-relaxed text-muted">
            매달 전체 원금 상환액 + 전체 이자 = 전체 월 납입액입니다. 일정표가 입력되지 않은 대출은 합계에서 빠지며
            &quot;+ 미입력 N건&quot;으로 표시하고, 그 이후의 남은 원금은 &quot;미확정&quot;으로 표시합니다.
            {hasAutoLoans && ` ${INTEREST_NOTE}`}
          </p>
        </Card>
      </div>
    </>
  );
}
