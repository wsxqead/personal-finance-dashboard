import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Amount } from "@/components/ui/amount";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatMonth } from "@/lib/dates";
import { formatPercent, formatWon } from "@/lib/format";
import { formatRate } from "@/lib/labels";
import { isThisMonthMissing } from "@/lib/schedule";
import type { LoanProjection } from "@/types/finance";

export function LoanStatus({ projections }: { projections: LoanProjection[] }) {
  const sorted = [...projections].sort(
    (a, b) =>
      Number(a.state === "paid-off") - Number(b.state === "paid-off") || b.currentBalance - a.currentBalance,
  );

  return (
    <Card
      title="대출별 현황"
      description="막대는 최초 대출금 대비 갚은 비율"
      action={
        <Link href="/loans" className="flex items-center text-xs text-muted hover:text-foreground">
          전체 보기
          <ChevronRight className="size-3.5" aria-hidden />
        </Link>
      }
      className="h-full"
    >
      <ul className="-mx-2 space-y-1">
        {sorted.map((projection) => (
          <LoanStatusItem key={projection.loan.id} projection={projection} />
        ))}
      </ul>
    </Card>
  );
}

function LoanStatusItem({ projection }: { projection: LoanProjection }) {
  const { loan, currentBalance, progress, thisMonth, payoffMonth, state } = projection;
  const paidOff = state === "paid-off";

  return (
    <li className={paidOff ? "opacity-70" : undefined}>
      <Link href={`/loans/${loan.id}`} className="block rounded-xl px-2 py-2.5 transition-colors hover:bg-surface-alt">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium">{loan.name}</span>
              {paidOff && <Badge tone="primary">완납</Badge>}
            </div>
            <p className="mt-0.5 text-xs text-muted">
              {loan.lender} · {formatRate(loan)}
            </p>
          </div>
          <div className="text-right">
            <Amount value={currentBalance} className="text-[15px] font-semibold" />
            <p className="num mt-0.5 text-xs text-muted">최초 {formatWon(loan.originalAmount)}</p>
          </div>
        </div>
        <Progress value={progress} className="mt-2.5" label={`${loan.name} 상환 진행률`} />
        <div className="num mt-1.5 flex justify-between gap-2 text-xs text-muted">
          <span>
            상환 {formatPercent(progress)}
            {payoffMonth ? ` · ${paidOff ? "완납" : "예상 완납"} ${formatMonth(payoffMonth)}` : " · 완납월 미정"}
          </span>
          <span>
            {paidOff
              ? "납입 없음"
              : isThisMonthMissing(projection)
                ? "이번 달 일정표 미입력"
                : thisMonth
                  ? `이번 달 ${formatWon(thisMonth.payment)}`
                  : projection.nextDue
                    ? `다음 납부 ${formatMonth(projection.nextDue.month)} ${formatWon(projection.nextDue.payment)}`
                    : "이번 달 납입 없음"}
          </span>
        </div>
      </Link>
    </li>
  );
}
