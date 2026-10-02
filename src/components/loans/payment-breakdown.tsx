import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Amount } from "@/components/ui/amount";
import { Card } from "@/components/ui/card";
import { formatMonth } from "@/lib/dates";
import { formatManwon } from "@/lib/format";
import type { Loan, PortfolioMonth } from "@/types/finance";

/** 한 달 전체 납입액이 어떤 대출에서 나오는지 (대출별 기여도) */
export function PaymentBreakdown({ month, loans }: { month: PortfolioMonth; loans: Loan[] }) {
  const items = loans
    .filter((loan) => month.byLoan[loan.id])
    .map((loan) => ({ loan, ...month.byLoan[loan.id] }))
    .sort((a, b) => b.payment - a.payment);
  const missing = loans.filter((loan) => month.missingLoans.includes(loan.id));

  return (
    <Card
      title={`${formatMonth(month.month)} 대출별 납입`}
      description="전체 납입액이 어느 대출에서 나오는지"
      className="h-full"
    >
      {items.length === 0 ? (
        <p className="text-sm text-muted">
          {missing.length > 0 ? "이 달 상환 일정표가 입력된 대출이 없습니다." : "이 달에는 납입할 대출이 없습니다."}
        </p>
      ) : (
        <>
          <ul className="-mx-2 space-y-1">
            {items.map(({ loan, principal, interest, payment }) => (
              <li key={loan.id}>
                <Link
                  href={`/loans/${loan.id}`}
                  className="group block rounded-xl px-2 py-2 transition-colors hover:bg-surface-alt"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="flex items-center gap-1 text-sm font-medium">
                      {loan.name}
                      <ChevronRight className="size-3.5 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </span>
                    <Amount value={payment} className="text-sm font-semibold" />
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-alt" aria-hidden>
                    <div
                      className="h-full rounded-full bg-primary-strong/70"
                      style={{ width: `${(payment / month.payment) * 100}%` }}
                    />
                  </div>
                  <p className="num mt-1 text-xs text-muted">
                    원금 {formatManwon(principal)} + 이자 {formatManwon(interest)} ·{" "}
                    {Math.round((payment / month.payment) * 100)}%
                  </p>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-baseline justify-between border-t pt-3">
            <span className="text-sm font-medium">{missing.length > 0 ? "입력된 합계" : "총 납입"}</span>
            <Amount value={month.payment} className="text-base font-semibold" />
          </div>
        </>
      )}
      {missing.length > 0 && (
        <div className="mt-4 rounded-xl border border-dashed px-3 py-2.5">
          <p className="text-xs font-medium text-muted">일정표 미입력 {missing.length}건</p>
          <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[13px]">
            {missing.map((loan) => (
              <li key={loan.id}>
                <Link href={`/loans/${loan.id}`} className="underline-offset-2 hover:underline">
                  {loan.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
