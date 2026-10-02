import type { ReactNode } from "react";
import { Amount } from "@/components/ui/amount";
import { Card } from "@/components/ui/card";
import { formatMonth } from "@/lib/dates";
import { formatWon } from "@/lib/format";
import type { DebtSummary } from "@/types/finance";

/**
 * 누적 원금 상환과 실제 순부채 감소의 차이를 보여줍니다.
 *   순부채 감소 = 누적 원금 상환 − 누적 신규 대출
 */
export function DebtFlow({ summary }: { summary: DebtSummary }) {
  return (
    <Card title="대출 흐름" description="기록 시작 이후 누적 (카드 미결제 제외)" className="h-full">
      <dl className="space-y-3 text-sm">
        <Row label="최고 대출 잔액" sub={formatMonth(summary.peakMonth)}>
          <Amount value={summary.peakDebt} />
        </Row>
        <Row label="현재 대출 잔액">
          <Amount value={summary.currentDebt} className="font-semibold" />
        </Row>
      </dl>

      <div className="my-4 border-t" />

      <dl className="space-y-3 text-sm">
        <Row label="누적 원금 상환">
          <Amount value={-summary.totalPrincipalPaid} tone="decrease" />
        </Row>
        <Row label="누적 신규 대출">
          <Amount value={summary.totalNewBorrowing} tone="increase" signed />
        </Row>
        <div className="flex items-baseline justify-between gap-3 rounded-xl bg-primary-soft px-3 py-2.5">
          <dt className="font-medium">순부채 감소</dt>
          <dd>
            <Amount
              value={summary.netReduction}
              tone={summary.netReduction >= 0 ? "decrease" : "increase"}
              className="font-semibold"
            />
          </dd>
        </div>
      </dl>

      <p className="mt-4 text-xs leading-relaxed text-muted">
        {summary.totalNewBorrowing > 0 &&
          `갚은 원금 ${formatWon(summary.totalPrincipalPaid)} 중 ${formatWon(summary.totalNewBorrowing)}은 새로 받은 대출로 상쇄되었습니다. `}
        같은 기간 이자로 {formatWon(summary.totalInterestPaid)}을 냈습니다.
      </p>
    </Card>
  );
}

function Row({ label, sub, children }: { label: string; sub?: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted">
        {label}
        {sub && <span className="ml-1.5 text-xs">{sub}</span>}
      </dt>
      <dd>{children}</dd>
    </div>
  );
}
