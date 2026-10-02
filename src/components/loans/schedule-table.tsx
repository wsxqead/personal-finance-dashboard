import { KindBadge } from "@/components/ui/kind-badge";
import { formatMonthShort } from "@/lib/dates";
import { formatManwon, formatNumber } from "@/lib/format";
import type { ScheduleSource, YearMonth } from "@/types/finance";

export interface ScheduleTableRow {
  month: YearMonth;
  /** 금융사 일정표 회차 */
  installment?: number;
  kind: "actual" | "forecast";
  openingBalance?: number;
  /** 이 달에 새로 빌린 금액 (대출 실행, 추가 인출) */
  borrowed?: number;
  principal: number;
  interest: number;
  payment: number;
  closingBalance: number;
  cumulativePrincipal?: number;
  cumulativeInterest?: number;
  source?: ScheduleSource;
  interestEstimated?: boolean;
  /** 원금 미입력 (대출 행) */
  principalMissing?: boolean;
  /** 이자 미입력 (대출 행) */
  interestUnknown?: boolean;
  /** 월말 원금을 확정할 수 있는지 (false 면 "미확정") */
  balanceKnown?: boolean;
  /** 합계 행에서 미입력으로 빠진 대출 수 */
  missingCount?: number;
}

interface ScheduleTableProps {
  rows: ScheduleTableRow[];
  /** 월초 원금 열 표시 */
  showOpening?: boolean;
  /** 누적 원금/이자 열 표시 */
  showCumulative?: boolean;
  closingLabel?: string;
  caption?: string;
}

/**
 * 월별 상환표. 실제 행과 예상 행 사이에 구분선을 넣고,
 * 긴 표는 세로 스크롤(머리글 고정), 좁은 화면은 가로 스크롤을 허용합니다.
 */
export function ScheduleTable({
  rows,
  showOpening = false,
  showCumulative = false,
  closingLabel = "월말 원금",
  caption,
}: ScheduleTableProps) {
  const columnCount = 5 + (showOpening ? 1 : 0) + (showCumulative ? 2 : 0);
  const firstForecastIndex = rows.findIndex((row) => row.kind === "forecast");
  const thBase = "sticky top-0 z-10 bg-surface px-2 py-2.5 font-normal whitespace-nowrap";
  const th = `${thBase} text-right`;

  return (
    <div className="-mx-5 max-h-[30rem] overflow-auto md:-mx-6">
      <table className="w-full min-w-[34rem] text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className="text-xs text-muted">
          <tr>
            <th className={`${thBase} pl-5 text-left md:pl-6`}>월</th>
            {showOpening && <th className={th}>월초 원금</th>}
            <th className={th}>원금 상환</th>
            <th className={th}>이자</th>
            <th className={th}>총 납입</th>
            <th className={th}>{closingLabel}</th>
            {showCumulative && <th className={th}>누적 원금</th>}
            {showCumulative && <th className={`${th} pr-5 md:pr-6`}>누적 이자</th>}
          </tr>
        </thead>
        <tbody className="num">
          {rows.map((row, index) => {
            const isActual = row.kind === "actual";
            // 합계 행에서 납입이 0원이고 미입력 대출이 있으면 0원 대신 "미입력"
            const allMissing = (row.missingCount ?? 0) > 0 && row.principal === 0 && row.interest === 0;
            const td = "px-2 py-2 text-right whitespace-nowrap";
            return [
              index === firstForecastIndex && index > 0 && (
                <tr key={`${row.month}-divider`}>
                  <td
                    colSpan={columnCount}
                    className="border-t-2 border-dashed border-primary-strong/40 bg-primary-soft/40 px-5 py-1.5 font-sans text-xs font-medium text-primary-text md:px-6"
                  >
                    이번 달부터 예상
                  </td>
                </tr>
              ),
              <tr key={row.month} className={`border-t ${isActual ? "bg-surface-alt/60 text-muted" : ""}`}>
                <td className="py-2 pr-2 pl-5 font-sans whitespace-nowrap md:pl-6">
                  <span className="num mr-2">
                    {formatMonthShort(row.month)}
                    {row.installment !== undefined && (
                      <span className="ml-1 text-[11px] text-muted">{row.installment}회차</span>
                    )}
                  </span>
                  <KindBadge kind={row.kind} />
                  {(row.borrowed ?? 0) > 0 && (
                    <span className="ml-1 text-[10px] font-medium text-increase">
                      신규 +{formatManwon(row.borrowed ?? 0, { suffix: "" })}
                    </span>
                  )}
                  {row.source === "manual" && (
                    <span className="ml-1 text-[10px] text-primary-text" title="금융사 상환 일정표(src/data/schedules/) 값">
                      일정표
                    </span>
                  )}
                </td>
                {showOpening && (
                  <td className={td}>
                    {index > 0 && rows[index - 1].balanceKnown === false ? (
                      <MissingCell label="미확정" />
                    ) : (
                      formatOptional(row.openingBalance)
                    )}
                  </td>
                )}
                <td className={td}>
                  {row.principalMissing || allMissing ? <MissingCell /> : formatNumber(row.principal)}
                </td>
                <td className={td}>{row.interestUnknown || allMissing ? <MissingCell /> : formatNumber(row.interest)}</td>
                <td className={`${td} font-medium ${isActual ? "" : "text-foreground"}`}>
                  {row.principalMissing || row.interestUnknown || (allMissing && row.payment === 0) ? (
                    <MissingCell />
                  ) : (
                    formatNumber(row.payment)
                  )}
                  {(row.missingCount ?? 0) > 0 && !(allMissing && row.payment === 0) && (
                    <span className="block font-sans text-[10px] font-normal text-muted">+ 미입력 {row.missingCount}건</span>
                  )}
                </td>
                <td className={`${td} ${showCumulative ? "" : "pr-5 md:pr-6"}`}>
                  {row.balanceKnown === false ? <MissingCell label="미확정" /> : formatNumber(row.closingBalance)}
                </td>
                {showCumulative && <td className={td}>{formatOptional(row.cumulativePrincipal)}</td>}
                {showCumulative && (
                  <td className={`${td} pr-5 md:pr-6`}>{formatOptional(row.cumulativeInterest)}</td>
                )}
              </tr>,
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}

function formatOptional(value: number | undefined): string {
  return value === undefined ? "–" : formatNumber(value);
}

function MissingCell({ label = "미입력" }: { label?: string }) {
  return <span className="font-sans text-xs text-muted">{label}</span>;
}
