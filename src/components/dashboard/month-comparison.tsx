import { Card } from "@/components/ui/card";
import { Missing } from "@/components/ui/missing";
import { formatMonthShort } from "@/lib/dates";
import { formatManwon, formatNumber } from "@/lib/format";
import type { MonthlyRecord } from "@/types/finance";

interface Row {
  label: string;
  key: keyof Pick<
    MonthlyRecord,
    | "income"
    | "principalPaid"
    | "interestPaid"
    | "newBorrowing"
    | "cardPayment"
    | "fixedExpenses"
    | "livingExpenses"
    | "closingDebt"
  >;
}

const rows: Row[] = [
  { label: "수입", key: "income" },
  { label: "원금 상환", key: "principalPaid" },
  { label: "이자", key: "interestPaid" },
  { label: "신규 대출", key: "newBorrowing" },
  { label: "카드값", key: "cardPayment" },
  { label: "고정지출", key: "fixedExpenses" },
  { label: "생활비", key: "livingExpenses" },
  { label: "월말 부채", key: "closingDebt" },
];

export function MonthComparison({ previous, current }: { previous: MonthlyRecord; current: MonthlyRecord }) {
  return (
    <Card title="지난달과 비교" description="지난달 실제 vs 이번 달 예상" className="h-full">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-muted">
            <th className="pb-2 text-left font-normal">항목</th>
            <th className="pb-2 text-right font-normal">{formatMonthShort(previous.month)} 실제</th>
            <th className="pb-2 text-right font-normal">{formatMonthShort(current.month)} 예상</th>
            <th className="pb-2 text-right font-normal">차이</th>
          </tr>
        </thead>
        <tbody className="num">
          {rows.map(({ label, key }) => {
            const prev = previous[key];
            const next = current[key];
            const diff = next - prev;
            const m = current.missing;
            // 예상 월에서 아직 입력되지 않은 값은 비교하지 않음
            const unknown =
              !!m &&
              ((key === "income" && m.income) ||
                (key === "livingExpenses" && m.livingExpenses) ||
                ((key === "principalPaid" || key === "interestPaid") && m.loans.length > 0) ||
                (key === "closingDebt" && m.balance));
            const isDebt = key === "closingDebt";
            const diffClass =
              diff === 0
                ? "text-muted"
                : isDebt || key === "newBorrowing"
                  ? diff < 0
                    ? "text-primary-text"
                    : "text-increase"
                  : "text-foreground";

            return (
              <tr key={key} className={`border-t ${isDebt ? "font-semibold" : ""}`}>
                <td className="py-2 font-sans text-muted">{label}</td>
                <td className="py-2 text-right">
                  <ResponsiveNumber value={prev} />
                </td>
                <td className="py-2 text-right">
                  {unknown ? <Missing className="font-sans text-xs" /> : <ResponsiveNumber value={next} />}
                </td>
                <td className={`py-2 text-right whitespace-nowrap ${unknown ? "text-muted" : diffClass}`}>
                  {unknown || diff === 0 ? "–" : formatManwon(diff, { signed: true })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

/** 좁은 화면에서는 만원 단위, 넓은 화면에서는 원 단위 전체 표시 */
function ResponsiveNumber({ value }: { value: number }) {
  return (
    <>
      <span className="sm:hidden">{formatManwon(value, { suffix: "" })}</span>
      <span className="hidden sm:inline">{formatNumber(value)}</span>
    </>
  );
}
