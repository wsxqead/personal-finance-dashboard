"use client";

import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMonth, formatMonthShort } from "@/lib/dates";
import { formatAxisManwon, formatWon } from "@/lib/format";
import type { RepaymentBar } from "@/lib/timeline";

const AXIS_TICK = { fill: "var(--muted)", fontSize: 11 };
const STACK = "payment";

/** 월별 원금/이자 누적 막대. 실제는 진한 색, 예상은 옅은 색 */
export function RepaymentChart({ bars, height = 240 }: { bars: RepaymentBar[]; height?: number }) {
  const firstForecast = bars.find((bar) => bar.kind === "forecast");
  const hasActual = bars.some((bar) => bar.kind === "actual");

  return (
    <div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted">
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-[var(--chart-line)]" aria-hidden />
          원금
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-[var(--chart-interest)]" aria-hidden />
          이자
        </li>
        {hasActual && firstForecast && (
          <li className="flex items-center gap-1.5">
            <span className="flex gap-0.5" aria-hidden>
              <span className="size-2.5 rounded-sm bg-[var(--chart-principal-forecast)]" />
              <span className="size-2.5 rounded-sm bg-[var(--chart-interest-forecast)]" />
            </span>
            옅은 색 = 예상
          </li>
        )}
      </ul>
      <div style={{ height }} className="-ml-2 mt-3">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height }}>
          <BarChart data={bars} margin={{ top: 20, right: 12, bottom: 0, left: 0 }} barCategoryGap="20%">
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis
              dataKey="month"
              tickFormatter={formatMonthShort}
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
              minTickGap={18}
              tickMargin={8}
            />
            <YAxis tickFormatter={formatAxisManwon} tick={AXIS_TICK} axisLine={false} tickLine={false} width={62} />
            <Tooltip
              cursor={{ fill: "var(--muted)", fillOpacity: 0.08 }}
              content={({ active, payload }) => (
                <BarTooltip active={active} bar={payload?.[0]?.payload as RepaymentBar | undefined} />
              )}
            />
            {hasActual && firstForecast && (
              <ReferenceLine
                x={firstForecast.month}
                stroke="var(--border)"
                strokeDasharray="3 3"
                label={{ value: "이번 달", position: "top", fill: "var(--muted)", fontSize: 11 }}
              />
            )}
            <Bar dataKey="principalActual" stackId={STACK} fill="var(--chart-line)" maxBarSize={22} isAnimationActive={false} />
            <Bar
              dataKey="interestActual"
              stackId={STACK}
              fill="var(--chart-interest)"
              radius={[3, 3, 0, 0]}
              maxBarSize={22}
              isAnimationActive={false}
            />
            <Bar
              dataKey="principalForecast"
              stackId={STACK}
              fill="var(--chart-principal-forecast)"
              maxBarSize={22}
              isAnimationActive={false}
            />
            <Bar
              dataKey="interestForecast"
              stackId={STACK}
              fill="var(--chart-interest-forecast)"
              radius={[3, 3, 0, 0]}
              maxBarSize={22}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function BarTooltip({ active, bar }: { active?: boolean; bar?: RepaymentBar }) {
  if (!active || !bar) return null;
  const missing = bar.missingCount ?? 0;
  const allMissing = missing > 0 && bar.principal === 0 && bar.interest === 0;
  return (
    <div className="min-w-48 rounded-xl border bg-surface px-3.5 py-3 text-xs shadow-lg shadow-black/5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="font-semibold text-foreground">{formatMonth(bar.month)}</span>
        <span className="text-muted">{bar.kind === "actual" ? "실제" : "예상"}</span>
      </div>
      {allMissing ? (
        <div className="text-sm font-semibold text-muted">일정표 미입력</div>
      ) : (
        <div className="num text-base font-semibold text-foreground">{formatWon(bar.principal + bar.interest)}</div>
      )}
      <dl className="mt-2 space-y-1 border-t pt-2">
        <Row label="원금" value={allMissing ? "미입력" : formatWon(bar.principal)} />
        <Row label="이자" value={allMissing ? "미입력" : formatWon(bar.interest)} />
        <Row label="월말 잔액" value={bar.balanceKnown === false ? "미확정" : formatWon(bar.balance)} />
        {missing > 0 && !allMissing && <Row label="미입력" value={`대출 ${missing}건`} />}
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="num text-foreground">{value}</dd>
    </div>
  );
}
