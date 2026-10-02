import type { ReactNode } from "react";
import { Amount } from "@/components/ui/amount";
import { KindBadge } from "@/components/ui/kind-badge";
import { Missing } from "@/components/ui/missing";
import { formatMonth, monthDiff } from "@/lib/dates";
import { formatManwon } from "@/lib/format";
import { INTEREST_NOTE, VARIABLE_RATE_NOTE } from "@/lib/labels";
import type { LoanPortfolio, PortfolioMonth } from "@/types/finance";
import { PaymentEquation } from "./payment-equation";

const HERO = "mt-2 block text-[2.25rem] leading-none font-bold tracking-tight md:text-[2.75rem]";

/** /loans 상단: 남은 원금, 이번 달·다음 달 납입, 잔여 이자, 예상 완납 */
export function LoanOverview({ portfolio }: { portfolio: LoanPortfolio }) {
  const [thisMonth, nextMonth] = portfolio.schedule;
  const active = portfolio.projections.filter((p) => p.state === "active");
  const monthsLeft = portfolio.payoffMonth ? monthDiff(portfolio.currentMonth, portfolio.payoffMonth) + 1 : null;
  const missingNow = thisMonth?.missingLoans.length ?? 0;
  const interestHasEstimate = active.some((p) => p.thisMonth?.source === "auto" || p.thisMonth?.interestEstimated);
  const hasAutoLoans = active.some((p) => p.loan.repaymentType !== "manual");
  const incompleteLoans = active.filter((p) => p.interestIncomplete).length;

  return (
    <div className="grid gap-3 md:gap-4 lg:grid-cols-5">
      {/* 이번 달 납입 예정 — 가장 강조 */}
      <section className="rounded-2xl border bg-surface p-5 shadow-soft md:p-7 lg:col-span-3 lg:order-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted">이번 달 납입 예정 · {formatMonth(portfolio.currentMonth)}</p>
          <KindBadge kind="forecast" />
        </div>

        {thisMonth && thisMonth.payment > 0 ? (
          <>
            <Amount value={thisMonth.payment} className={HERO} />
            <p className="mt-2 text-[13px] text-muted">
              {missingNow > 0
                ? `입력된 일정표 기준 합계 · 대출 ${missingNow}건은 미입력이라 빠져 있습니다`
                : `대출 ${Object.keys(thisMonth.byLoan).length}건의 원금 + 이자 합계`}
            </p>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <PaymentEquation
                principal={thisMonth.principal}
                interest={thisMonth.interest}
                balanceAfter={thisMonth.balanceKnown ? thisMonth.closingBalance : undefined}
                interestEstimated={interestHasEstimate}
              />
              {nextMonth && <NextMonth month={nextMonth} />}
            </div>
          </>
        ) : missingNow > 0 ? (
          <>
            <Missing className="mt-2 block text-[2rem] leading-none font-bold tracking-tight md:text-[2.25rem]">
              일정표 미입력
            </Missing>
            <p className="mt-3 text-[13px] leading-relaxed text-muted">
              대출 {missingNow}건의 이번 달 상환 일정표가 입력되지 않았습니다. src/data/schedules/ 의 각 파일에 금융사
              일정표 금액을 입력하면 이번 달 납입액과 원금·이자가 표시됩니다.
            </p>
          </>
        ) : (
          <p className="mt-3 text-sm text-muted">이번 달 예정된 대출 납입이 없습니다.</p>
        )}
      </section>

      {/* 남은 원금 / 잔여 이자 / 예상 완납 */}
      <section className="rounded-2xl border bg-surface p-5 shadow-soft md:p-7 lg:col-span-2 lg:order-1">
        <p className="text-sm text-muted">남은 원금 · 대출 {active.length}건</p>
        <Amount value={portfolio.remainingPrincipal} className={HERO} />

        <dl className="mt-6 space-y-2.5 text-sm">
          {portfolio.interestIncomplete ? (
            <>
              <Row label="앞으로 낼 이자">
                <Missing>일정표 미완성</Missing>
              </Row>
              {portfolio.remainingInterest > 0 && (
                <Row label="입력된 일정표 기준 이자">
                  <Amount value={portfolio.remainingInterest} />
                </Row>
              )}
              <Row label="예상 총 상환액" strong>
                <Missing>계산할 수 없음</Missing>
              </Row>
              <p className="text-[11px] leading-relaxed text-muted">
                완납까지 일정표가 입력되지 않은 대출 {incompleteLoans}건이 있어 전체 이자와 총 상환액을 확정할 수
                없습니다.
              </p>
            </>
          ) : (
            <>
              <Row label="앞으로 낼 예상 이자">
                <Amount value={portfolio.remainingInterest} />
              </Row>
              <Row label="예상 총 상환액" strong>
                <Amount value={portfolio.totalRepayment} />
              </Row>
              <p className="text-right text-[11px] text-muted">= 남은 원금 + 예상 잔여 이자</p>
            </>
          )}
        </dl>

        <div className="mt-5 rounded-xl bg-primary-soft px-4 py-3">
          <p className="text-xs text-muted">현재 계획 기준 모든 대출 예상 완납</p>
          {portfolio.payoffMonth ? (
            <p className="mt-0.5 text-lg font-semibold">
              {formatMonth(portfolio.payoffMonth)}
              <span className="num ml-2 text-xs font-normal text-muted">{monthsLeft}개월 남음</span>
            </p>
          ) : active.length === 0 ? (
            <p className="mt-0.5 text-sm font-medium">모든 대출 완납</p>
          ) : (
            <>
              <p className="mt-0.5 text-lg font-semibold">계산할 수 없음</p>
              <p className="mt-0.5 text-xs text-muted">
                완납월이 확인되지 않은 대출 {portfolio.unresolved.length}건 · 모든 대출의 일정표가 완납까지 입력되면
                표시됩니다.
              </p>
            </>
          )}
        </div>

        <ul className="mt-4 space-y-1 text-[11px] leading-relaxed text-muted">
          <li>· 상환 일정표 대출은 일정표에 입력된 금액만 사용하고, 입력되지 않은 달은 추정하지 않습니다.</li>
          {hasAutoLoans && <li>· {INTEREST_NOTE}</li>}
          {hasAutoLoans && portfolio.hasVariableRate && <li>· 변동금리 대출 포함: {VARIABLE_RATE_NOTE}</li>}
        </ul>
      </section>
    </div>
  );
}

function NextMonth({ month }: { month: PortfolioMonth }) {
  const missing = month.missingLoans.length;
  return (
    <div className="rounded-xl bg-surface-alt p-4">
      <p className="text-xs text-muted">다음 달 · {formatMonth(month.month)}</p>
      {month.payment === 0 && missing > 0 ? (
        <Missing className="mt-1 block text-base">일정표 미입력</Missing>
      ) : (
        <>
          <Amount value={month.payment} className="mt-1 block text-lg font-semibold" />
          <p className="num mt-1 text-xs text-muted">
            원금 {formatManwon(month.principal)} + 이자 {formatManwon(month.interest)}
          </p>
          {missing > 0 && <p className="mt-1 text-xs text-muted">대출 {missing}건 미입력</p>}
        </>
      )}
    </div>
  );
}

function Row({ label, strong = false, children }: { label: string; strong?: boolean; children: ReactNode }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 ${strong ? "border-t pt-2.5 font-semibold" : ""}`}>
      <dt className={strong ? undefined : "text-muted"}>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
