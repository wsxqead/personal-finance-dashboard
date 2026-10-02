import { Amount } from "@/components/ui/amount";
import { Card } from "@/components/ui/card";
import { KindBadge } from "@/components/ui/kind-badge";
import { Missing } from "@/components/ui/missing";
import { formatMonth } from "@/lib/dates";
import { isCashflowComplete } from "@/lib/forecast";
import type { MonthlyRecord } from "@/types/finance";

export function MonthlyCashflow({ record }: { record: MonthlyRecord }) {
  const missing = record.missing;
  const missingLoans = missing?.loans.length ?? 0;
  // 대출이 전부 미입력이면 0원 대신 "미입력", 일부만 미입력이면 입력된 값 + 표시
  const loanState = missingLoans === 0 ? "known" : record.loanPayment === 0 ? "missing" : "partial";

  const outflows = [
    { label: "대출 원금", value: record.principalPaid, state: loanState },
    { label: "대출 이자", value: record.interestPaid, state: loanState },
    { label: "카드값", value: record.cardPayment, state: "known" },
    { label: "고정지출", value: record.fixedExpenses, state: "known" },
    { label: "생활비", value: record.livingExpenses, state: missing?.livingExpenses ? "missing" : "known" },
  ];
  const base = Math.max(missing?.income ? Math.max(...outflows.map((o) => o.value)) : record.income, 1);
  const complete = isCashflowComplete(record);

  const reasons = [
    missing?.income && "월 수입",
    missing?.livingExpenses && "생활비",
    missingLoans > 0 && `대출 ${missingLoans}건 상환 일정표`,
  ].filter(Boolean);

  return (
    <Card
      title="이번 달 현금흐름"
      description={formatMonth(record.month)}
      action={<KindBadge kind={record.isForecast ? "forecast" : "actual"} />}
      className="h-full"
    >
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted">월 수입</span>
        {missing?.income ? <Missing /> : <Amount value={record.income} className="text-lg font-semibold" />}
      </div>
      {record.newBorrowing > 0 && (
        <div className="mt-1 flex items-baseline justify-between text-sm">
          <span className="text-muted">신규 대출 유입</span>
          <Amount value={record.newBorrowing} tone="increase" signed />
        </div>
      )}

      <ul className="mt-4 space-y-3">
        {outflows.map(({ label, value, state }) => (
          <li key={label}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted">{label}</span>
              {state === "missing" ? (
                <Missing className="text-sm" />
              ) : (
                <span>
                  {state === "partial" && <span className="mr-1.5 text-[11px] text-muted">일부 미입력</span>}
                  <Amount value={value} />
                </span>
              )}
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-alt" aria-hidden>
              {state !== "missing" && (
                <div
                  className="h-full rounded-full bg-muted/35"
                  style={{ width: `${Math.min(100, (value / base) * 100)}%` }}
                />
              )}
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex items-baseline justify-between border-t pt-4">
        <span className="text-sm font-medium">예상 잔액</span>
        {complete ? (
          <Amount
            value={record.cashBalance}
            tone={record.cashBalance < 0 ? "increase" : "default"}
            className="text-lg font-semibold"
          />
        ) : (
          <Missing>계산할 수 없음</Missing>
        )}
      </div>
      {!complete && (
        <p className="mt-2 text-[11px] leading-relaxed text-muted">
          {reasons.join(", ")}이(가) 입력되지 않았습니다. 월 수입·생활비는 plan.ts, 대출 상환은 src/data/schedules/ 에서
          입력합니다.
        </p>
      )}
    </Card>
  );
}
