import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Amount } from "@/components/ui/amount";
import { Missing } from "@/components/ui/missing";
import { Progress } from "@/components/ui/progress";
import { formatMonth, monthDiff } from "@/lib/dates";
import { formatManwon, formatPercent } from "@/lib/format";
import type { DebtSummary as DebtSummaryData, LoanPortfolio, MonthlyRecord } from "@/types/finance";

interface DebtSummaryProps {
  summary: DebtSummaryData;
  /** 이번 달 계획 (첫 예상 월) */
  currentPlan?: MonthlyRecord;
  portfolio: LoanPortfolio;
  /** 카드 미결제 금액 합계 (대출과 별도) */
  cardOutstanding: number;
}

export function DebtSummary({ summary, currentPlan, portfolio, cardOutstanding }: DebtSummaryProps) {
  const reduced = summary.netReduction >= 0;
  const monthsLeft = portfolio.payoffMonth ? monthDiff(portfolio.currentMonth, portfolio.payoffMonth) + 1 : null;
  const missingLoanCount = currentPlan?.missing?.loans.length ?? 0;
  const paymentHint = !currentPlan
    ? undefined
    : missingLoanCount === 0
      ? `원금 ${formatManwon(currentPlan.principalPaid)} + 이자 ${formatManwon(currentPlan.interestPaid)}`
      : currentPlan.loanPayment === 0
        ? `대출 ${missingLoanCount}건 일정표 미입력`
        : `입력된 일정표 기준 · ${missingLoanCount}건 미입력`;

  return (
    <div className="grid gap-3 md:gap-4 lg:grid-cols-5">
      {/* 현재 총 대출 잔액 — 가장 강조 */}
      <section className="rounded-2xl border bg-surface p-5 shadow-soft md:p-7 lg:col-span-3">
        <p className="text-sm text-muted">
          현재 총 대출 잔액{" "}
          <span className="text-xs">
            · {summary.lastMonth ? `${formatMonth(summary.lastMonth)} 말 기준` : `${formatMonth(summary.firstMonth)} 초 기준`}
          </span>
        </p>
        <p className="num mt-2 text-[2.5rem] leading-none font-bold tracking-tight md:text-5xl">
          <Amount value={summary.currentDebt} format="symbol" />
        </p>
        {summary.lastMonth ? (
          <p className="mt-3 text-[15px] text-foreground">
            처음 기록한 날보다{" "}
            <Amount
              value={Math.abs(summary.netReduction)}
              format="symbol"
              tone={reduced ? "decrease" : "increase"}
              className="font-semibold"
            />{" "}
            {reduced ? "줄었습니다." : "늘었습니다."}
          </p>
        ) : (
          <p className="mt-3 text-[15px] text-muted">
            기록 시작 시점 잔액입니다. 월별 기록을 입력하면 줄어든 금액이 표시됩니다.
          </p>
        )}

        {cardOutstanding > 0 && (
          <dl className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-surface-alt px-4 py-3 text-sm">
            <div>
              <dt className="text-xs text-muted">카드 미결제 금액</dt>
              <dd className="mt-0.5">
                <Amount value={cardOutstanding} className="font-semibold" />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">총 금융부담 (대출 + 카드)</dt>
              <dd className="mt-0.5">
                <Amount value={summary.currentDebt + cardOutstanding} className="font-semibold" />
              </dd>
            </div>
            <p className="col-span-2 text-[11px] leading-relaxed text-muted">
              카드 미결제 금액은 대출이 아니므로 상환률·예상 완납·이자 계산에는 포함하지 않습니다.
            </p>
          </dl>
        )}

        <div className="mt-6">
          <div className="mb-2 flex items-baseline justify-between text-xs text-muted">
            <span>
              {formatMonth(summary.firstMonth)} 시작 대출 {formatManwon(summary.initialDebt)}
            </span>
            <span className="num font-medium text-primary-text">{formatPercent(summary.reductionRate)} 감소</span>
          </div>
          <Progress value={summary.reductionRate} label="최초 대출 잔액 대비 감소율" />
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:col-span-2">
        <StatTile label="최초 대비 감소" hint={`${formatPercent(summary.reductionRate)} ${reduced ? "감소" : "증가"}`}>
          <Amount value={summary.netReduction} format="manwon" tone={reduced ? "decrease" : "increase"} />
        </StatTile>
        {currentPlan && (
          <StatTile label="이번 달 대출 납입" hint={paymentHint} href="/loans">
            {missingLoanCount > 0 && currentPlan.loanPayment === 0 ? (
              <Missing>일정표 미입력</Missing>
            ) : (
              <Amount value={currentPlan.loanPayment} format="manwon" />
            )}
          </StatTile>
        )}
        {portfolio.interestIncomplete ? (
          <StatTile
            label="앞으로 낼 이자"
            hint={
              portfolio.remainingInterest > 0
                ? `입력된 일정표 기준 ${formatManwon(portfolio.remainingInterest)}`
                : "일정표를 완납까지 입력하면 계산"
            }
            href="/loans"
          >
            <Missing>일정표 미완성</Missing>
          </StatTile>
        ) : (
          <StatTile label="앞으로 낼 예상 이자" hint="현재 금리 유지 시" href="/loans">
            <Amount value={portfolio.remainingInterest} format="manwon" />
          </StatTile>
        )}
        <StatTile
          label="모든 대출 예상 완납"
          hint={monthsLeft !== null ? `${monthsLeft}개월 남음` : "일정표 미완성"}
          href="/loans"
        >
          {portfolio.payoffMonth ? formatMonth(portfolio.payoffMonth) : <Missing>계산할 수 없음</Missing>}
        </StatTile>
      </div>
    </div>
  );
}

interface StatTileProps {
  label: string;
  hint?: string;
  /** 지정하면 자세히 보기 링크가 됩니다. */
  href?: string;
  children: ReactNode;
}

function StatTile({ label, hint, href, children }: StatTileProps) {
  const body = (
    <>
      <p className="flex items-center justify-between gap-1 text-[13px] leading-snug text-muted">
        {label}
        {href && <ChevronRight className="size-3.5 shrink-0" aria-hidden />}
      </p>
      <div>
        <p className="mt-3 text-lg font-semibold tracking-tight md:text-xl">{children}</p>
        {hint && <p className="num mt-0.5 text-[11px] text-muted">{hint}</p>}
      </div>
    </>
  );
  const className = "flex flex-col justify-between rounded-2xl border bg-surface p-4 shadow-soft md:p-5";

  return href ? (
    <Link href={href} className={`${className} transition-colors hover:border-primary-strong/50`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
