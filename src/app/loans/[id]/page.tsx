import { ArrowLeft, Calculator, CalendarCheck, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { DebtChart } from "@/components/dashboard/debt-chart";
import { PaymentEquation } from "@/components/loans/payment-equation";
import { RepaymentChart } from "@/components/loans/repayment-chart";
import { ScheduleTable } from "@/components/loans/schedule-table";
import { Amount } from "@/components/ui/amount";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { KindBadge } from "@/components/ui/kind-badge";
import { Missing } from "@/components/ui/missing";
import { Progress } from "@/components/ui/progress";
import { loans } from "@/data/loans";
import { formatDate, formatMonth, monthDiff } from "@/lib/dates";
import { existsAtTrackingStart, filled, getLoanStartMonth, getPaymentDay } from "@/lib/finance";
import { formatManwon, formatPercent, formatWon } from "@/lib/format";
import {
  formatRate,
  INTEREST_NOTE,
  payoffPendingLabel,
  repaymentTypeFullLabel,
  repaymentTypeLabel,
  scheduleSourceLabel,
  VARIABLE_RATE_NOTE,
} from "@/lib/labels";
import {
  annuityPayment,
  getFirstPaymentMonth,
  getInstallmentNumber,
  getMaturityMonth,
  isRowMissing,
  isThisMonthMissing,
} from "@/lib/schedule";
import { getFinanceOverview } from "@/lib/overview";
import { buildLoanTimeline, buildRepaymentBars } from "@/lib/timeline";
import type { LoanProjection } from "@/types/finance";

export const dynamicParams = false;

/** 상환표 위쪽에 함께 보여줄 최근 실제 기록 개월 수 */
const RECENT_ACTUAL_ROWS = 3;

export function generateStaticParams() {
  return loans.map((loan) => ({ id: loan.id }));
}

export async function generateMetadata({ params }: PageProps<"/loans/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: loans.find((loan) => loan.id === id)?.name ?? "대출" };
}

export default async function LoanDetailPage({ params }: PageProps<"/loans/[id]">) {
  const { id } = await params;
  const { portfolio, summary } = getFinanceOverview();
  const projection = portfolio.projections.find((p) => p.loan.id === id);
  if (!projection) notFound();

  const { loan, state, history, schedule } = projection;
  const isManual = loan.repaymentType === "manual";
  const scheduleEnd = loan.schedule?.at(-1)?.month;
  // 표에는 최근 실제 기록 몇 달 + 예상 전체, 나머지 실제 기록은 접어서 보여줌
  const withoutCumulative = (rows: typeof history) =>
    rows.map((row) => ({ ...row, cumulativePrincipal: undefined, cumulativeInterest: undefined }));
  const recentHistory = schedule.length > 0 ? history.slice(-RECENT_ACTUAL_ROWS) : history;
  // 미입력 달과 그 이후(잔액 미확정)는 누적 합계가 의미 없으므로 "–" 로 표시
  const scheduleRows = [
    ...withoutCumulative(recentHistory),
    ...schedule.map((row) =>
      row.balanceKnown && !row.interestUnknown && !schedule.some((r) => r.month <= row.month && r.interestUnknown)
        ? row
        : { ...row, cumulativePrincipal: undefined, cumulativeInterest: undefined },
    ),
  ];
  const bars = buildRepaymentBars(
    [...history, ...schedule].map((row) => ({
      month: row.month,
      kind: row.kind,
      principal: row.principal,
      interest: row.interest,
      balance: row.closingBalance,
      balanceKnown: row.balanceKnown,
      missingCount: row.principalMissing || row.interestUnknown ? 1 : 0,
    })),
  );

  return (
    <>
      <Link
        href="/loans"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        대출 목록
      </Link>

      <div className="mb-5 md:mb-7">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{loan.name}</h1>
          {state === "paid-off" && <Badge tone="primary">완납</Badge>}
          {state === "upcoming" && <Badge>실행 예정</Badge>}
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
          <span>{loan.lender}</span>
          <span aria-hidden>·</span>
          <span>{loan.category}</span>
          <span aria-hidden>·</span>
          <span>{formatRate(loan)}</span>
          {loan.variableRate && <Badge>변동금리</Badge>}
        </p>
        {state !== "paid-off" && (
          <p className="mt-3">
            {projection.hasSchedule ? (
              <Badge tone="primary">
                <CalendarCheck className="size-3" aria-hidden />
                금융사 상환 일정표 기준
              </Badge>
            ) : (
              <Badge>
                <Calculator className="size-3" aria-hidden />
                예상 계산 기준 · {repaymentTypeLabel[loan.repaymentType]}
              </Badge>
            )}
          </p>
        )}
      </div>

      {state === "active" && (projection.missingMonths > 0 || (isManual && !projection.payoffMonth)) && (
        <p className="mb-4 rounded-xl border border-dashed bg-surface px-4 py-3 text-sm text-muted">
          <span className="font-medium text-foreground">
            {projection.missingMonths > 0 ? "상환 일정표 미입력" : "상환 일정표 미완성"}
          </span>{" "}
          ·{" "}
          {projection.missingMonths > 0
            ? `원금 또는 이자가 입력되지 않은(null) 달이 ${projection.missingMonths}개월 있습니다.`
            : scheduleEnd
              ? `일정표가 ${formatMonth(scheduleEnd)}까지 입력되어 있지만 잔액이 0원이 되는 달까지 이어지지 않습니다.`
              : "상환 일정표가 비어 있습니다."}{" "}
          src/data/schedules/ 의 이 대출 파일에 금융사 일정표 금액을 입력해주세요.
        </p>
      )}

      {projection.warnings.length > 0 && (
        <ul className="mb-4 space-y-1.5 rounded-xl border border-increase/40 bg-increase-soft px-4 py-3 text-sm">
          {projection.warnings.map((warning) => (
            <li key={warning} className="flex gap-2">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-increase" aria-hidden />
              <span>{warning}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-3 md:space-y-4">
        <div className="grid gap-3 md:gap-4 lg:grid-cols-5">
          <ThisMonthCard projection={projection} />
          <BalanceCard projection={projection} />
        </div>

        {history.length > 0 || schedule.some((row) => !isRowMissing(row)) ? (
          <div className="grid gap-3 md:gap-4 lg:grid-cols-2">
            <Card title="원금 잔액 추이" description="실선은 실제, 점선은 예상" className="min-w-0">
              <DebtChart points={buildLoanTimeline(projection)} height={240} />
            </Card>
            <Card title="월별 원금 · 이자" description="막대 전체 = 그 달 총 납입액" className="min-w-0">
              <RepaymentChart bars={bars} />
            </Card>
          </div>
        ) : (
          state === "active" && (
            <Card title="상환 흐름 그래프">
              <p className="py-6 text-center text-sm text-muted">
                아직 표시할 금액이 없습니다. 상환 일정표나 월별 기록을 입력하면 잔액 추이와 원금·이자 그래프가 그려집니다.
              </p>
            </Card>
          )
        )}

        <div className="grid gap-3 md:gap-4 lg:grid-cols-3">
          <Card title="기본 정보" className="lg:col-span-1">
            <LoanInfo projection={projection} trackingStart={summary.firstMonth} />
          </Card>

          <Card
            title="월별 상환표"
            description={state === "paid-off" ? "실제 납입 기록" : "실제 기록과 완납까지의 예상"}
            className="min-w-0 lg:col-span-2"
          >
            {scheduleRows.length > 0 ? (
              <>
                <ScheduleTable
                  caption={`${loan.name} 월별 상환표`}
                  rows={scheduleRows}
                  showOpening
                  showCumulative={schedule.length > 0}
                />
                {history.length > recentHistory.length && (
                  <details className="group mt-4 rounded-xl border">
                    <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium select-none">
                      <span className="mr-1.5 inline-block text-muted transition-transform group-open:rotate-90">›</span>
                      전체 실제 납입 기록 ({history.length}개월)
                    </summary>
                    <div className="border-t px-5 pb-1 md:px-6">
                      <ScheduleTable caption={`${loan.name} 실제 납입 기록`} rows={withoutCumulative(history)} showOpening />
                    </div>
                  </details>
                )}
                <p className="mt-4 text-[11px] leading-relaxed text-muted">
                  {schedule.length > 0 &&
                    isManual
                      ? `누적 원금·이자는 이번 달부터의 합계입니다. "미입력"은 일정표에 아직 금액을 적지 않은 달(null)이고, 미입력 달 이후의 월말 원금은 "미확정"으로 표시합니다.`
                      : `누적 원금·이자는 이번 달부터의 합계입니다. "일정표" 표시는 금융사 상환 일정표 금액이고, 표시가 없는 예상 행은 자동 계산입니다. ${INTEREST_NOTE}`}
                  {schedule.length === 0 && "월별 기록(monthly-records.ts)에 입력한 실제 납입 내역입니다."}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted">표시할 상환 기록이 없습니다.</p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

/** 이번 달 납입 예정 — 상세 페이지에서 가장 강조 */
function ThisMonthCard({ projection }: { projection: LoanProjection }) {
  const { loan, payoffMonth, state, schedule, currentMonth } = projection;
  const paymentDay = getPaymentDay(loan);
  const firstPaymentMonth = getFirstPaymentMonth(loan);
  const missing = isThisMonthMissing(projection);
  // 이번 달 납입이 없고 일정표가 다음 달 이후부터 시작하면 "다음 납부"를 보여줌
  const isNextDue = !projection.thisMonth && !missing && projection.nextDue !== undefined;
  const thisMonth = projection.thisMonth ?? (isNextDue ? projection.nextDue : undefined);
  const nextMonth = thisMonth ? schedule[schedule.indexOf(thisMonth) + 1] : undefined;
  const bothMissing = missing && (!thisMonth || (thisMonth.principalMissing && thisMonth.interestUnknown));

  return (
    <section className="rounded-2xl border bg-surface p-5 shadow-soft md:p-7 lg:col-span-3 lg:order-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted">
          {isNextDue ? "다음 납부" : "이번 달 납입 예정"}
          {state === "active" && (
            <span>
              {" "}
              · {formatMonth(thisMonth?.month ?? currentMonth)}
              {thisMonth && paymentDay && ` ${paymentDay}일`}
            </span>
          )}
          {thisMonth?.installment && <span> · {thisMonth.installment}회차</span>}
        </p>
        {state === "active" && <KindBadge kind="forecast" />}
      </div>

      {state !== "active" ? (
        <p className="mt-3 text-sm text-muted">
          {state === "paid-off"
            ? `${payoffMonth ? formatMonth(payoffMonth) + "에 " : ""}완납되어 이번 달 납입이 없습니다.`
            : `${formatMonth(getLoanStartMonth(loan) ?? "")}에 실행될 예정입니다.`}
        </p>
      ) : bothMissing ? (
        <>
          <Missing className="mt-2 block text-[2rem] leading-none font-bold tracking-tight md:text-[2.25rem]">
            일정표 미입력
          </Missing>
          <p className="mt-3 text-[13px] leading-relaxed text-muted">
            {thisMonth
              ? "이번 달 원금과 이자가 아직 입력되지 않았습니다."
              : "이번 달이 상환 일정표에 없습니다."}{" "}
            금융사 일정표 금액을 src/data/schedules/ 의 이 대출 파일에 입력하면 납입액이 표시됩니다.
          </p>
        </>
      ) : thisMonth ? (
        <>
          {missing ? (
            <Missing className="mt-2 block text-[2rem] leading-none font-bold tracking-tight md:text-[2.25rem]">
              일부 미입력
            </Missing>
          ) : (
            <Amount
              value={thisMonth.payment}
              className="mt-2 block text-[2.25rem] leading-none font-bold tracking-tight md:text-[2.75rem]"
            />
          )}
          <p className="mt-2 text-[13px] text-muted">
            총 납입금 = 원금 + 이자 · {scheduleSourceLabel[thisMonth.source]}
            {thisMonth.source === "auto" && ` (${repaymentTypeLabel[loan.repaymentType]})`}
          </p>
          {isNextDue && (
            <p className="mt-1 text-[12px] text-muted">
              {filled(loan.paidThroughMonth) && loan.paidThroughMonth >= currentMonth
                ? `이번 달(${formatMonth(currentMonth)})분은 이미 납입했습니다.`
                : firstPaymentMonth && firstPaymentMonth > currentMonth
                  ? `아직 첫 납입 전입니다. 1회차는 ${formatMonth(firstPaymentMonth)}${paymentDay ? ` ${paymentDay}일` : ""}부터입니다.`
                  : `이번 달(${formatMonth(currentMonth)})은 일정표상 납입이 없습니다.`}
            </p>
          )}
          {projection.autoFromMonth && (
            <p className="mt-1 text-[12px] text-muted">
              상환 일정표는 {formatMonth(projection.autoFromMonth)} 전까지 입력되어 있고, 그 뒤로는 예상 계산입니다.
            </p>
          )}
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <PaymentEquation
              principal={thisMonth.principal}
              interest={thisMonth.interest}
              balanceAfter={thisMonth.balanceKnown ? thisMonth.closingBalance : undefined}
              interestEstimated={thisMonth.interestEstimated}
              principalMissing={thisMonth.principalMissing}
              interestUnknown={thisMonth.interestUnknown}
            />
            {nextMonth ? (
              <div className="rounded-xl bg-surface-alt p-4">
                <p className="text-xs text-muted">
                  {isNextDue ? "그다음" : "다음 달"} · {formatMonth(nextMonth.month)}
                  {nextMonth.installment && ` · ${nextMonth.installment}회차`}
                </p>
                {isRowMissing(nextMonth) ? (
                  <Missing className="mt-1 block text-base">일정표 미입력</Missing>
                ) : (
                  <>
                    <Amount value={nextMonth.payment} className="mt-1 block text-lg font-semibold" />
                    <p className="num mt-1 text-xs text-muted">
                      원금 {formatManwon(nextMonth.principal)} + 이자 {formatManwon(nextMonth.interest)}
                    </p>
                  </>
                )}
              </div>
            ) : thisMonth.closingBalance <= 0 && thisMonth.balanceKnown ? (
              <div className="rounded-xl bg-primary-soft p-4 text-sm">
                이번 납입으로 <span className="font-semibold">완납</span> 예정입니다.
              </div>
            ) : (
              <div className="rounded-xl bg-surface-alt p-4">
                <p className="text-xs text-muted">다음 달</p>
                <Missing className="mt-1 block text-base">일정표 미입력</Missing>
              </div>
            )}
          </div>
          <p className="mt-4 text-[11px] leading-relaxed text-muted">
            {thisMonth.source === "manual"
              ? "금융사 상환 일정표에 적힌 금액입니다. 실제 납입이 끝나면 monthly-records.ts 의 기록이 우선합니다."
              : INTEREST_NOTE}
          </p>
        </>
      ) : (
        <p className="mt-3 text-sm text-muted">이번 달 예정된 납입이 없습니다.</p>
      )}
    </section>
  );
}

/** 현재 원금, 진행률, 예상 완납, 잔여 이자 */
function BalanceCard({ projection }: { projection: LoanProjection }) {
  const { loan, currentBalance, progress, payoffMonth, remainingInterest, state, schedule } = projection;
  const firstMonth = schedule[0]?.month;
  const monthsLeft = payoffMonth && firstMonth ? monthDiff(firstMonth, payoffMonth) + 1 : null;
  const isManual = loan.repaymentType === "manual";
  const maturity = getMaturityMonth(loan);

  return (
    <section className="rounded-2xl border bg-surface p-5 shadow-soft md:p-7 lg:col-span-2 lg:order-1">
      <p className="text-sm text-muted">현재 원금</p>
      <Amount
        value={currentBalance}
        className="mt-2 block text-[2.25rem] leading-none font-bold tracking-tight md:text-[2.75rem]"
      />
      <p className="num mt-2 text-sm text-muted">최초 {formatWon(loan.originalAmount)}</p>
      {loan.monthlyPayment !== undefined && (
        <p className="mt-3 flex items-baseline justify-between gap-3 text-sm">
          <span className="text-muted">월 정기 납입</span>
          <Amount value={loan.monthlyPayment} className="font-semibold" />
        </p>
      )}

      <div className="mt-5">
        <div className="mb-2 flex justify-between text-xs">
          <span className="text-muted">상환 진행률</span>
          <span className="num font-medium text-primary-text">{formatPercent(progress)}</span>
        </div>
        <Progress value={progress} label="상환 진행률" />
      </div>

      <div className="mt-5 rounded-xl bg-primary-soft px-4 py-3">
        <p className="text-xs text-muted">
          {state === "paid-off" ? "완납" : isManual ? "상환 일정표 기준 예상 완납" : "예상 완납"}
        </p>
        <p className="mt-0.5 text-lg font-semibold">
          {payoffMonth ? formatMonth(payoffMonth) : payoffPendingLabel(loan)}
          {monthsLeft !== null && state !== "paid-off" && (
            <span className="num ml-2 text-xs font-normal text-muted">{monthsLeft}개월 남음</span>
          )}
        </p>
        {!payoffMonth && state === "active" && (
          <p className="mt-1 text-xs text-muted">
            {isManual
              ? "상환 일정표를 잔액이 0원이 되는 달까지 빠짐없이 입력하면 표시됩니다."
              : "만기월 또는 상환 계획(monthlyPrincipal, schedule)을 입력하면 계산됩니다."}
          </p>
        )}
      </div>

      {maturity && state !== "paid-off" && (
        <div className="mt-2 flex items-baseline justify-between gap-3 rounded-xl border px-4 py-2.5 text-sm">
          <span className="text-muted">계약 만기</span>
          <span className="font-semibold">{formatMonth(maturity)}</span>
        </div>
      )}

      {state !== "paid-off" && (
        <dl className="mt-5 space-y-2 text-sm">
          {projection.interestIncomplete ? (
            <>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted">앞으로 낼 이자</dt>
                <dd>
                  <Missing>일정표 미완성</Missing>
                </dd>
              </div>
              {remainingInterest > 0 && (
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted">입력된 일정표 기준 이자</dt>
                  <dd>
                    <Amount value={remainingInterest} />
                  </dd>
                </div>
              )}
              <div className="flex items-baseline justify-between gap-3 border-t pt-2 font-semibold">
                <dt>예상 총 상환액</dt>
                <dd>
                  <Missing>계산할 수 없음</Missing>
                </dd>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted">{isManual ? "앞으로 낼 이자" : "앞으로 낼 예상 이자"}</dt>
                <dd>
                  <Amount value={remainingInterest} />
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 border-t pt-2 font-semibold">
                <dt>예상 총 상환액</dt>
                <dd>
                  <Amount value={currentBalance + remainingInterest} />
                </dd>
              </div>
              <p className="text-right text-[11px] text-muted">= 현재 원금 + 잔여 이자</p>
              {!isManual && loan.variableRate && <p className="text-[11px] text-muted">{VARIABLE_RATE_NOTE}</p>}
            </>
          )}
        </dl>
      )}
    </section>
  );
}

function LoanInfo({ projection, trackingStart }: { projection: LoanProjection; trackingStart: string }) {
  const { loan, openingBalance, currentBalance, thisMonth } = projection;
  const startedDuringTracking = !existsAtTrackingStart(loan, trackingStart);
  const paymentDay = getPaymentDay(loan);

  const monthlyPrincipal =
    loan.monthlyPrincipal !== undefined
      ? formatWon(loan.monthlyPrincipal)
      : loan.repaymentType === "equal-principal" && thisMonth
        ? `${formatWon(thisMonth.principal)} (자동 계산)`
        : undefined;
  const monthlyPayment =
    loan.monthlyPayment !== undefined
      ? `${formatWon(loan.monthlyPayment)}${loan.repaymentType === "manual" ? " (참고값)" : ""}`
      : loan.repaymentType === "equal-payment" && (thisMonth ?? projection.nextDue)
        ? `약 ${formatWon((thisMonth ?? projection.nextDue)!.payment)}`
        : undefined;
  // 최초 대출 조건(최초 대출금, 금리, 총 회차) 기준 원리금균등 월 납입액
  const originalPayment =
    loan.repaymentType === "equal-payment" && loan.totalInstallments && loan.interestRate !== null
      ? annuityPayment(loan.originalAmount, loan.interestRate, loan.totalInstallments)
      : undefined;
  const firstPaymentMonth = getFirstPaymentMonth(loan);
  // 남은 납입 (예상 구간에서 납입이 있는 달)
  const remainingRows = projection.schedule.filter((row) => row.payment > 0);

  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5 text-sm lg:grid-cols-1 xl:grid-cols-2">
      <Info label="금융사">{loan.lender}</Info>
      <Info label="최초 대출금">
        <Amount value={loan.originalAmount} />
      </Info>
      <Info label="기록 시작 시점 잔액">
        {startedDuringTracking ? <span className="text-muted">기록 중 실행</span> : <Amount value={openingBalance} />}
      </Info>
      <Info label="현재 원금 잔액">
        <Amount value={currentBalance} />
      </Info>
      <Info label="금리">
        {loan.interestRate === null ? (
          <>
            <Muted>금리 정보 없음</Muted>
            <span className="block text-xs text-muted">상환 일정표 기준</span>
          </>
        ) : (
          <>
            {formatRate(loan)} <span className="text-xs text-muted">{loan.variableRate ? "변동" : "고정"}</span>
          </>
        )}
      </Info>
      <Info label="상환 방식">{repaymentTypeFullLabel[loan.repaymentType]}</Info>
      <Info label="대출 시작일">{filled(loan.startedAt) ? formatDate(loan.startedAt) : <Muted>미입력</Muted>}</Info>
      <Info label="계약 만기">
        {getMaturityMonth(loan) ? formatMonth(getMaturityMonth(loan)!) : <Muted>미입력</Muted>}
      </Info>
      <Info label="월 납입일">{paymentDay ? `매월 ${paymentDay}일` : <Muted>미입력</Muted>}</Info>
      {filled(loan.paidThroughMonth) && (
        <Info label="납입 현황">
          {getInstallmentNumber(loan, loan.paidThroughMonth) !== undefined &&
            `${getInstallmentNumber(loan, loan.paidThroughMonth)}회차 · `}
          {formatMonth(loan.paidThroughMonth)}분까지 납입 완료
        </Info>
      )}
      {monthlyPrincipal && <Info label="월 원금">{monthlyPrincipal}</Info>}
      {loan.totalInstallments && (
        <Info label="계약 기간">
          {loan.totalInstallments}개월 · 총 {loan.totalInstallments}회
          {!firstPaymentMonth && remainingRows.length > 0 && (
            <span className="block text-xs text-muted">
              남은 {remainingRows.length}회 · {formatMonth(remainingRows[0].month)} ~{" "}
              {formatMonth(remainingRows[remainingRows.length - 1].month)}
            </span>
          )}
          {firstPaymentMonth && (
            <span className="block text-xs text-muted">
              1회차 {formatMonth(firstPaymentMonth)}
              {thisMonth?.installment
                ? ` · 이번 달 ${thisMonth.installment}회차`
                : projection.nextDue?.installment &&
                  projection.nextDue.installment > 1 &&
                  ` · 다음 ${projection.nextDue.installment}회차`}
            </span>
          )}
        </Info>
      )}
      {monthlyPayment && (
        <Info
          label={
            loan.repaymentType === "manual"
              ? "월 정기 납입"
              : loan.repaymentType === "equal-payment" && loan.monthlyPayment === undefined
                ? "예상 월 납입액"
                : "월 납입액"
          }
        >
          {monthlyPayment}
          {originalPayment !== undefined && loan.monthlyPayment === undefined && (
            <span className="block text-xs text-muted">최초 조건 기준 약 {formatWon(originalPayment)}</span>
          )}
        </Info>
      )}
      {loan.schedule && loan.schedule.length > 0 && (
        <Info label="상환 일정표">
          {formatMonth(loan.schedule[0].month)} ~ {formatMonth(loan.schedule[loan.schedule.length - 1].month)} (
          {loan.schedule.length}개월)
        </Info>
      )}
      {loan.note && (
        <div className="col-span-2 lg:col-span-1 xl:col-span-2">
          <dt className="text-xs text-muted">메모</dt>
          <dd className="mt-0.5">{loan.note}</dd>
        </div>
      )}
    </dl>
  );
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="num mt-0.5">{children}</dd>
    </div>
  );
}

function Muted({ children }: { children: ReactNode }) {
  return <span className="text-muted">{children}</span>;
}
