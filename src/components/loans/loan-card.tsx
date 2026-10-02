import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Amount } from "@/components/ui/amount";
import { Badge } from "@/components/ui/badge";
import { Missing } from "@/components/ui/missing";
import { Progress } from "@/components/ui/progress";
import { formatMonth } from "@/lib/dates";
import { formatPercent, formatWon } from "@/lib/format";
import { formatRate, payoffPendingLabel, repaymentTypeLabel } from "@/lib/labels";
import { getMaturityMonth, isThisMonthMissing } from "@/lib/schedule";
import type { LoanProjection } from "@/types/finance";

/** /loans 목록의 대출 카드 — 클릭하면 상세 페이지로 이동 */
export function LoanCard({ projection }: { projection: LoanProjection }) {
  const { loan, state, currentBalance, progress, thisMonth, payoffMonth } = projection;
  const paidOff = state === "paid-off";
  const thisMonthMissing = isThisMonthMissing(projection);
  const maturity = getMaturityMonth(loan);
  const needsSchedule = state === "active" && (projection.missingMonths > 0 || thisMonthMissing);

  return (
    <Link
      href={`/loans/${loan.id}`}
      className="group block rounded-2xl border bg-surface p-5 shadow-soft transition-colors hover:border-primary-strong/50 focus-visible:outline-2 focus-visible:outline-primary-strong md:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-[15px] font-semibold">{loan.name}</h3>
            {paidOff && <Badge tone="primary">완납</Badge>}
            {state === "upcoming" && <Badge>실행 예정</Badge>}
            {needsSchedule && <Badge>일정표 미입력</Badge>}
            {projection.warnings.length > 0 && <Badge tone="increase">만기 확인</Badge>}
          </div>
          <p className="mt-0.5 text-xs text-muted">
            {loan.lender} · {formatRate(loan)} · {projection.hasSchedule ? "금융사 일정표 기준" : `예상 계산 · ${repaymentTypeLabel[loan.repaymentType]}`}
          </p>
        </div>
        <ChevronRight
          className="size-5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs text-muted">현재 원금</p>
          <Amount value={currentBalance} className="mt-0.5 block text-xl font-semibold tracking-tight" />
        </div>
        <p className="num text-right text-xs text-muted">최초 {formatWon(loan.originalAmount)}</p>
      </div>

      <Progress value={progress} className="mt-3" label={`${loan.name} 상환 진행률`} />
      <p className="num mt-1.5 text-xs text-muted">상환 진행률 {formatPercent(progress)}</p>

      <dl className="mt-4 grid grid-cols-2 gap-3 border-t pt-4 text-xs">
        <div>
          <dt className="text-muted">이번 달 납입</dt>
          <dd className="mt-0.5 text-sm font-medium">
            {thisMonthMissing ? (
              <Missing />
            ) : thisMonth ? (
              <Amount value={thisMonth.payment} />
            ) : projection.nextDue && !paidOff ? (
              <span className="text-muted">
                없음
                <span className="ml-1 text-xs font-normal">· 다음 {formatMonth(projection.nextDue.month)}</span>
              </span>
            ) : (
              <span className="text-muted">없음</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-muted">
            {paidOff ? "완납" : loan.repaymentType === "manual" ? "일정표 기준 완납" : "예상 완납"}
          </dt>
          <dd className="mt-0.5 text-sm font-medium">
            {payoffMonth ? formatMonth(payoffMonth) : <Missing>{payoffPendingLabel(loan)}</Missing>}
          </dd>
        </div>
      </dl>
      {maturity && !paidOff && <p className="mt-2 text-xs text-muted">계약 만기 {formatMonth(maturity)}</p>}
    </Link>
  );
}
