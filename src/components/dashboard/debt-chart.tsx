"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMonth, formatMonthShort } from "@/lib/dates";
import { formatAxisManwon, formatManwon, formatWon } from "@/lib/format";
import type { TimelinePoint } from "@/lib/timeline";

const AXIS_TICK = { fill: "var(--muted)", fontSize: 11 };

interface DebtChartProps {
  points: TimelinePoint[];
  height?: number;
}

export function DebtChart({ points, height = 300 }: DebtChartProps) {
  const borrowings = points.filter((p) => p.newBorrowing > 0 && p.actual !== undefined);
  const lastActual = points.findLast((p) => p.kind === "actual");

  return (
    <div>
      <ChartLegend hasForecast={points.some((p) => p.kind === "forecast")} hasBorrowing={borrowings.length > 0} />
      <div style={{ height }} className="-ml-2 mt-3">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height }}>
          <LineChart data={points} margin={{ top: 24, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis
              dataKey="month"
              tickFormatter={formatMonthShort}
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
              minTickGap={18}
              interval="preserveStartEnd"
              tickMargin={8}
            />
            <YAxis
              tickFormatter={formatAxisManwon}
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
              width={62}
              domain={[0, "auto"]}
            />
            <Tooltip
              content={({ active, payload }) => (
                <TimelineTooltip active={active} point={payload?.[0]?.payload as TimelinePoint | undefined} />
              )}
              cursor={{ stroke: "var(--muted)", strokeOpacity: 0.35, strokeWidth: 1 }}
            />
            {lastActual && (
              <ReferenceLine
                x={lastActual.month}
                stroke="var(--border)"
                strokeDasharray="3 3"
                label={{ value: "지금", position: "insideTopRight", fill: "var(--muted)", fontSize: 11 }}
              />
            )}
            <Line
              type="linear"
              dataKey="forecast"
              stroke="var(--chart-forecast)"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              activeDot={{ r: 4, fill: "var(--chart-forecast)", stroke: "var(--surface)", strokeWidth: 2 }}
              connectNulls={false}
              isAnimationActive={false}
            />
            <Line
              type="linear"
              dataKey="actual"
              stroke="var(--chart-line)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: "var(--chart-line)", stroke: "var(--surface)", strokeWidth: 2 }}
              connectNulls={false}
              isAnimationActive={false}
            />
            {borrowings.map((p) => (
              <ReferenceDot
                key={p.month}
                x={p.month}
                y={p.actual}
                r={6}
                fill="var(--surface)"
                stroke="var(--chart-marker)"
                strokeWidth={2.5}
                label={{
                  value: `+${formatManwon(p.newBorrowing, { suffix: "" })}`,
                  position: "top",
                  offset: 10,
                  fill: "var(--increase)",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ChartLegend({ hasForecast, hasBorrowing }: { hasForecast: boolean; hasBorrowing: boolean }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted">
      <li className="flex items-center gap-1.5">
        <span className="h-0.5 w-5 rounded-full bg-[var(--chart-line)]" aria-hidden />
        실제 잔액
      </li>
      {hasForecast && (
        <li className="flex items-center gap-1.5">
          <span className="w-5 border-t-2 border-dashed border-[var(--chart-forecast)]" aria-hidden />
          예상 (현재 계획 유지 시)
        </li>
      )}
      {hasBorrowing && (
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full border-2 border-[var(--chart-marker)] bg-surface" aria-hidden />
          신규 대출
        </li>
      )}
    </ul>
  );
}

function TimelineTooltip({ active, point }: { active?: boolean; point?: TimelinePoint }) {
  if (!active || !point) return null;

  const isForecast = point.kind === "forecast";
  const balance = point.actual ?? point.forecast ?? 0;

  return (
    <div className="min-w-48 rounded-xl border bg-surface px-3.5 py-3 text-xs shadow-lg shadow-black/5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="font-semibold text-foreground">{formatMonth(point.month)}</span>
        <span className="text-muted">
          {point.kind === "start" ? "기록 시작" : isForecast ? "예상" : "실제"}
        </span>
      </div>
      <div className="num text-base font-semibold text-foreground">{formatWon(balance)}</div>
      {point.kind !== "start" && (
        <dl className="mt-2 space-y-1 border-t pt-2">
          <TooltipRow label="원금 상환" value={formatWon(point.principalPaid)} />
          <TooltipRow label="이자" value={formatWon(point.interestPaid)} />
          {point.newBorrowing > 0 && (
            <TooltipRow label="신규 대출" value={formatWon(point.newBorrowing, { signed: true })} accent />
          )}
          <TooltipRow label="전월 대비" value={formatWon(point.debtChange, { signed: true })} />
        </dl>
      )}
    </div>
  );
}

function TooltipRow({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className={`num ${accent ? "font-medium text-increase" : "text-foreground"}`}>{value}</dd>
    </div>
  );
}
