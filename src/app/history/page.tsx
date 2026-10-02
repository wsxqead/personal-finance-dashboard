import type { Metadata } from "next";
import { FinanceEvents } from "@/components/dashboard/finance-events";
import { Amount } from "@/components/ui/amount";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { financeEvents } from "@/data/events";
import { formatMonth } from "@/lib/dates";
import { getFinanceOverview } from "@/lib/overview";

export const metadata: Metadata = { title: "기록" };

export default function HistoryPage() {
  const { ledger } = getFinanceOverview();
  const records = [...ledger].reverse();

  return (
    <>
      <PageHeader
        title="기록"
        description="월별 기록과 회고. 데이터는 src/data/monthly-records.ts, events.ts 에서 수정합니다."
      />

      <div className="grid gap-3 md:gap-4 lg:grid-cols-5">
        <div className="space-y-3 md:space-y-4 lg:col-span-3">
          {records.length === 0 && (
            <Card title="월별 기록">
              <p className="text-sm text-muted">
                아직 입력된 월별 기록이 없습니다. 한 달이 끝나면 src/data/monthly-records.ts 에 실제 납입 내역과 회고를
                추가하세요.
              </p>
            </Card>
          )}
          {records.map((record) => (
            <Card key={record.month}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-[15px] font-semibold">{formatMonth(record.month)}</h2>
                <p className="text-sm">
                  <Amount value={record.closingDebt} className="font-semibold" />
                  <Amount value={record.debtChange} format="manwon" tone="debt-change" signed className="ml-2 text-xs" />
                </p>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-4">
                <Stat label="원금 상환" value={record.principalPaid} />
                <Stat label="이자" value={record.interestPaid} />
                <Stat label="신규 대출" value={record.newBorrowing} highlight={record.newBorrowing > 0} />
                <Stat label="현금 잔액" value={record.cashBalance} />
              </dl>
              {(record.review || record.note) && (
                <div className="mt-3 rounded-xl bg-surface-alt px-3.5 py-2.5 text-[13px] leading-relaxed">
                  {record.review && <p>{record.review}</p>}
                  {record.note && <p className="text-muted">메모: {record.note}</p>}
                </div>
              )}
            </Card>
          ))}
        </div>

        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-8">
            <FinanceEvents events={financeEvents} title="전체 이벤트" />
          </div>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="mt-0.5">
        <Amount value={value} format="manwon" tone={highlight ? "increase" : "default"} />
      </dd>
    </div>
  );
}
