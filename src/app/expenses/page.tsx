import type { Metadata } from "next";
import { Amount } from "@/components/ui/amount";
import { Card } from "@/components/ui/card";
import { Missing } from "@/components/ui/missing";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/ui/page-header";
import { cards } from "@/data/cards";
import { monthlyRecords } from "@/data/monthly-records";
import { formatMonth, formatMonthShort } from "@/lib/dates";
import { getActiveFixedExpenses, getCardOutstandingTotal, getExpectedCardTotal, sum } from "@/lib/finance";
import { formatNumber } from "@/lib/format";
import { getFinanceOverview } from "@/lib/overview";

export const metadata: Metadata = { title: "지출" };

export default function ExpensesPage() {
  const { portfolio } = getFinanceOverview();
  const month = portfolio.currentMonth;
  const activeFixed = getActiveFixedExpenses(month);
  const recentRecords = monthlyRecords.slice(-6).reverse();

  return (
    <>
      <PageHeader
        title="지출"
        description="카드값과 고정지출. 데이터는 src/data/cards.ts, fixed-expenses.ts 에서 수정합니다."
      />

      <div className="grid gap-3 md:gap-4 lg:grid-cols-2">
        <Card
          title="고정지출"
          description={`${formatMonth(month)} 기준`}
          action={<Amount value={sum(activeFixed.map((e) => e.amount))} className="text-sm font-semibold" />}
        >
          <ul className="divide-y text-sm">
            {activeFixed.map((expense) => (
              <li key={expense.id} className="flex items-baseline justify-between py-2.5">
                <span>
                  {expense.name}
                  {expense.dueDay && <span className="ml-2 text-xs text-muted">매월 {expense.dueDay}일</span>}
                </span>
                <Amount value={expense.amount} />
              </li>
            ))}
          </ul>
        </Card>

        <Card
          title="카드"
          description="이번 결제 예정액과 미결제 금액"
          action={
            <span className="text-right text-xs text-muted">
              월 예상 <Amount value={getExpectedCardTotal()} className="text-sm font-semibold text-foreground" />
            </span>
          }
        >
          <ul className="divide-y text-sm">
            {cards.map((card) => {
              const monthly = card.currentPayment ?? card.expectedMonthly;
              return (
                <li key={card.id} className="py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span>
                      {card.name}
                      <span className="ml-2 text-xs text-muted">
                        {card.issuer} · 매월 {card.paymentDay}일
                      </span>
                    </span>
                    {monthly !== undefined ? <Amount value={monthly} /> : <Missing className="text-xs" />}
                  </div>
                  <p className="mt-0.5 text-right text-[11px] text-muted">
                    {card.currentPayment !== undefined ? "이번 결제 예정액" : "월 예상 결제액"}
                  </p>
                  {card.outstandingBalance !== undefined && (
                    <div className="mt-2 rounded-lg bg-surface-alt px-3 py-2 text-xs">
                      <div className="flex justify-between gap-3">
                        <span className="text-muted">미결제 금액</span>
                        <Amount value={card.outstandingBalance} className="font-semibold" />
                      </div>
                      {card.originalUsedAmount !== undefined && (
                        <>
                          <div className="mt-1 flex justify-between gap-3 text-muted">
                            <span>처음 이용금액</span>
                            <Amount value={card.originalUsedAmount} tone="muted" />
                          </div>
                          <Progress
                            value={1 - card.outstandingBalance / card.originalUsedAmount}
                            className="mt-2"
                            label={`${card.name} 결제 진행률`}
                          />
                        </>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {getCardOutstandingTotal() > 0 && (
            <p className="mt-3 text-[11px] leading-relaxed text-muted">
              카드 미결제 금액은 대출이 아니므로 대출 잔액·상환률·완납월에는 포함하지 않고, 대시보드의 총 금융부담에만
              더합니다.
            </p>
          )}
        </Card>

        <Card title="최근 카드 결제" description="최근 6개월 실제 결제액" className="lg:col-span-2">
          <div className="-mx-1 overflow-x-auto px-1">
            <table className="w-full min-w-md text-sm">
              <thead>
                <tr className="text-xs text-muted">
                  <th className="pb-2 text-left font-normal">월</th>
                  {cards.map((card) => (
                    <th key={card.id} className="pb-2 text-right font-normal">
                      {card.name}
                    </th>
                  ))}
                  <th className="pb-2 text-right font-normal">합계</th>
                </tr>
              </thead>
              <tbody className="num">
                {recentRecords.length === 0 && (
                  <tr className="border-t">
                    <td colSpan={cards.length + 2} className="py-4 font-sans text-sm text-muted">
                      아직 월별 기록이 없습니다. monthly-records.ts 에 기록을 입력하면 카드별 결제액이 표시됩니다.
                    </td>
                  </tr>
                )}
                {recentRecords.map((record) => (
                  <tr key={record.month} className="border-t">
                    <td className="py-2 text-muted">{formatMonthShort(record.month)}</td>
                    {cards.map((card) => (
                      <td key={card.id} className="py-2 text-right">
                        {formatNumber(record.cardPayments[card.id] ?? 0)}
                      </td>
                    ))}
                    <td className="py-2 text-right font-medium">
                      {formatNumber(sum(Object.values(record.cardPayments)))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
