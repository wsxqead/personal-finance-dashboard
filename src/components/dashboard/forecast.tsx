import { Amount } from "@/components/ui/amount";
import { Card } from "@/components/ui/card";
import { Missing } from "@/components/ui/missing";
import { formatMonth } from "@/lib/dates";
import type { ForecastMilestone } from "@/lib/forecast";

export function Forecast({ milestones }: { milestones: ForecastMilestone[] }) {
  return (
    <Card title="앞으로의 예상" description="지금 상환 계획을 그대로 유지한다면" className="h-full">
      <ul className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
        {milestones.map((m) => (
          <li key={m.monthsAhead} className="rounded-xl bg-surface-alt p-4">
            <p className="text-xs">
              <span className="font-medium text-foreground">{m.monthsAhead}개월 후</span>
              <span className="block text-muted">{formatMonth(m.month)}</span>
            </p>
            {m.debt !== null && m.change !== null ? (
              <>
                <Amount value={m.debt} format="manwon" className="mt-2 block text-lg font-semibold" />
                <p className="mt-0.5 text-xs text-muted">
                  지금보다 <Amount value={m.change} format="manwon" tone="debt-change" />
                </p>
              </>
            ) : (
              <>
                <Missing className="mt-2 block text-base">계산할 수 없음</Missing>
                <p className="mt-0.5 text-xs text-muted">일정표 미입력</p>
              </>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs leading-relaxed text-muted">
        상환 일정표(src/data/schedules/)와 loans.ts 의 상환 조건을 기준으로 계산합니다. 일정표가 입력되지 않은 달이
        있으면 그 뒤의 부채는 추정하지 않습니다.
      </p>
    </Card>
  );
}
