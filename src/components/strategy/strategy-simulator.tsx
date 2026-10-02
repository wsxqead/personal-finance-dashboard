"use client";

import { Info } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Amount } from "@/components/ui/amount";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Missing } from "@/components/ui/missing";
import { formatMonth, monthDiff } from "@/lib/dates";
import { formatManwon, formatNumber, formatWon } from "@/lib/format";
import { formatRate } from "@/lib/labels";
import {
  applyToPortfolio,
  getBalancedScores,
  RELIEF_WINDOW,
  simulatePrepayment,
  sortStrategies,
  type BalancedScore,
  type LoanStrategyResult,
  type PortfolioBaseline,
  type PrepayMode,
  type StrategyView,
} from "@/lib/strategy";
import type { FinancePlan, LoanProjection, YearMonth } from "@/types/finance";

const QUICK_AMOUNTS = [500_000, 1_000_000, 2_000_000, 3_000_000];
const MAX_AMOUNT = 100_000_000_000;

const MODES: { value: PrepayMode; label: string; description: string }[] = [
  { value: "shorten-term", label: "기간 단축", description: "월 납입은 그대로, 완납을 앞당김" },
  { value: "reduce-payment", label: "월 납입 감소", description: "만기는 그대로, 월 납입을 줄임" },
];

const VIEWS: { value: StrategyView; label: string; description: string }[] = [
  { value: "interest", label: "이자 절감 기준", description: "예상 이자 절감액(중도상환수수료 차감)이 큰 순서" },
  {
    value: "burden",
    label: "월 부담 감소 기준",
    description: "월 납입이 더 빨리 줄어들거나 사라지는 순서 (같은 시점이면 감소액이 큰 순서)",
  },
  { value: "term", label: "완납기간 단축 기준", description: "완납이 앞당겨지는 개월 수가 큰 순서" },
  {
    value: "balanced",
    label: "균형 비교",
    description: `이자 절감 · 기간 단축 · 향후 ${RELIEF_WINDOW}개월 납입 감소를 후보 중 최댓값 대비 비율로 바꿔 평균한 비교 지수`,
  },
];

interface StrategySimulatorProps {
  projections: LoanProjection[];
  currentMonth: YearMonth;
  currentBalances: Record<string, number>;
  plan: FinancePlan;
  baseline: PortfolioBaseline;
}

export function StrategySimulator({ projections, currentMonth, currentBalances, plan, baseline }: StrategySimulatorProps) {
  const [amount, setAmount] = useState(1_000_000);
  const [mode, setMode] = useState<PrepayMode>("shorten-term");
  const [view, setView] = useState<StrategyView>("interest");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const ctx = { currentMonth, currentBalances, plan };
  const results = projections
    .filter((p) => p.state === "active")
    .map((p) => simulatePrepayment(p, amount, mode, ctx));
  const sorted = sortStrategies(results, view);
  const scores = getBalancedScores(results);
  const selected =
    sorted.find((r) => r.loan.id === selectedId && r.status === "ok") ?? sorted.find((r) => r.status === "ok");
  const effect = selected ? applyToPortfolio(baseline, selected) : undefined;
  const hasUnknownFee = results.some((r) => r.status === "ok" && !r.fee.known);
  const hasEstimated = results.some((r) => r.status === "ok" && r.estimated);
  const hasAssumedFee = results.some((r) => r.status === "ok" && r.fee.known && r.fee.assumed);
  const viewInfo = VIEWS.find((v) => v.value === view)!;

  return (
    <div className="space-y-3 md:space-y-4">
      <p className="flex gap-2 rounded-2xl border bg-surface px-4 py-3 text-[13px] leading-relaxed text-muted md:px-5">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        계산 결과를 나란히 비교하는 도구입니다. 어느 대출을 먼저 갚을지는 금리, 중도상환수수료, 비상자금, 금융사 조건을 함께
        고려해 직접 판단하세요.
      </p>

      {/* 입력 */}
      <Card title="추가 상환 가능 금액" description={`${formatMonth(currentMonth)} 기준, 한 대출에 전액 추가 상환한다고 가정`}>
        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <label className="flex items-baseline gap-2 border-b-2 border-primary-strong/60 pb-1 focus-within:border-primary-strong">
              <span className="sr-only">추가 상환 가능 금액 (원)</span>
              <input
                inputMode="numeric"
                value={amount > 0 ? formatNumber(amount) : ""}
                placeholder="0"
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "");
                  setAmount(Math.min(MAX_AMOUNT, Number(digits || "0")));
                }}
                className="num w-full min-w-0 bg-transparent text-3xl font-bold tracking-tight outline-none md:text-4xl"
              />
              <span className="text-lg text-muted">원</span>
            </label>
            <p className="num mt-1.5 text-xs text-muted">{amount > 0 ? formatManwon(amount) : "금액을 입력하세요"}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAmount(value)}
                  aria-pressed={amount === value}
                  className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                    amount === value
                      ? "border-primary-strong bg-primary-soft text-foreground"
                      : "text-muted hover:border-primary-strong/50 hover:text-foreground"
                  }`}
                >
                  {formatManwon(value)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-muted">추가 상환 후 처리 방식</p>
            <div role="radiogroup" aria-label="추가 상환 후 처리 방식" className="mt-2 grid grid-cols-2 gap-1 rounded-xl bg-surface-alt p-1">
              {MODES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  role="radio"
                  aria-checked={mode === m.value}
                  onClick={() => setMode(m.value)}
                  className={`rounded-lg px-3 py-2 text-left transition-colors ${
                    mode === m.value ? "bg-surface shadow-soft" : "text-muted hover:text-foreground"
                  }`}
                >
                  <span className="block text-sm font-medium">{m.label}</span>
                  <span className="block text-[11px] text-muted">{m.description}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted">
              추가 상환 후 기간을 줄일지 월 납입을 줄일지는 금융사마다 다릅니다. 실제 방식은 금융사에 확인하세요.
            </p>
          </div>
        </div>
      </Card>

      {/* 관점 선택 */}
      <div>
        <div role="tablist" aria-label="비교 기준" className="flex gap-1 overflow-x-auto rounded-xl border bg-surface p-1">
          {VIEWS.map((v) => (
            <button
              key={v.value}
              type="button"
              role="tab"
              aria-selected={view === v.value}
              onClick={() => setView(v.value)}
              className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                view === v.value ? "bg-primary-soft text-foreground" : "text-muted hover:text-foreground"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
        <p className="mt-2 px-1 text-xs text-muted">{viewInfo.description}</p>
      </div>

      {amount <= 0 ? (
        <p className="rounded-2xl border border-dashed bg-surface px-5 py-8 text-center text-sm text-muted">
          추가 상환 가능 금액을 입력하면 대출별 결과를 비교합니다.
        </p>
      ) : (
        <div className="grid gap-3 md:gap-4 lg:grid-cols-2">
          {sorted.map((result, index) => (
            <ResultCard
              key={result.loan.id}
              rank={result.status === "ok" ? index + 1 : undefined}
              result={result}
              view={view}
              score={scores.get(result.loan.id)}
              selected={selected?.loan.id === result.loan.id}
              onSelect={() => setSelectedId(result.loan.id)}
            />
          ))}
        </div>
      )}

      {amount > 0 && selected && effect && (
        <Card
          title={`전체 효과 · ${selected.loan.name}에 ${formatManwon(selected.applied)} 추가 상환 시`}
          description="모든 대출을 합친 기준 (다른 대출 카드의 '전체 효과 보기'로 바꿀 수 있습니다)"
        >
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            <Compare label="전체 남은 원금" before={baseline.remainingPrincipal} after={effect.remainingPrincipal} />
            <Compare
              label="전체 예상 잔여 이자"
              before={baseline.interestIncomplete ? null : baseline.remainingInterest}
              after={effect.remainingInterest}
              missingLabel="일정표 미완성"
            />
            <div>
              <dt className="text-xs text-muted">전체 예상 완납</dt>
              <dd className="mt-1 text-sm">
                {baseline.payoffMonth && effect.payoffMonth ? (
                  <>
                    <span className="text-muted">{formatMonth(baseline.payoffMonth)}</span> →{" "}
                    <span className="font-semibold">{formatMonth(effect.payoffMonth)}</span>
                  </>
                ) : (
                  <Missing>계산할 수 없음</Missing>
                )}
              </dd>
            </div>
            {effect.paymentMonth && effect.basePayment !== undefined && effect.newPayment !== undefined && (
              <Compare
                label={`월 납입액 (${formatMonth(effect.paymentMonth)})`}
                before={effect.basePayment}
                after={effect.newPayment}
              />
            )}
            <div>
              <dt className="text-xs text-muted">기존 대비 이자 절감</dt>
              <dd className="mt-1">
                <Amount value={effect.interestSaved} className="text-lg font-semibold" />
                {effect.fee.known && effect.fee.amount > 0 && (
                  <span className="num block text-xs text-muted">
                    중도상환수수료{effect.fee.assumed ? "(가정)" : ""} {formatWon(effect.fee.amount)} 차감 시{" "}
                    {formatWon(effect.netSaving)}
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">기존 대비 완납기간 단축 (전체)</dt>
              <dd className="mt-1 text-lg font-semibold">
                {effect.monthsShortened === null ? (
                  <Missing className="text-base">계산할 수 없음</Missing>
                ) : (
                  `${effect.monthsShortened}개월`
                )}
              </dd>
              {effect.monthsShortened === 0 && selected.monthsSaved > 0 && (
                <p className="mt-0.5 text-[11px] text-muted">
                  이 대출은 {selected.monthsSaved}개월 빨라지지만, 더 늦게 끝나는 다른 대출이 있어 전체 완납월은 그대로입니다.
                </p>
              )}
            </div>
          </dl>
        </Card>
      )}

      <ul className="space-y-1 px-1 text-[11px] leading-relaxed text-muted">
        {hasUnknownFee && <li>· 수수료 정보 미입력 대출은 중도상환수수료가 반영되지 않은 결과입니다.</li>}
        {hasAssumedFee && (
          <li>
            · &quot;가정&quot; 표시된 중도상환수수료는 금융사에서 확인한 값이 아니라 추가 상환 금액 × 2%로 가정한 값입니다. 실제
            수수료는 남은 면제 기간에 따라 줄어드는 방식이 많으니 금융사에 확인하세요.
          </li>
        )}
        {hasEstimated && (
          <li>
            · &quot;일정표 기준 추정&quot; 대출은 금융사 상환 일정표의 납입액을 바탕으로 추정한 값입니다. 실제 재산정 일정은 금융사에
            확인하세요.
          </li>
        )}
        <li>
          · 이자는 월 단위 단순 계산(월초 원금 × 연이율 ÷ 12)이며, 일할 이자·금리 변동·실제 청구 방식에 따라 달라질 수 있습니다.
        </li>
        <li>· 추가 상환 금액이 대출 잔액보다 크면 잔액까지만 반영하고 남는 금액을 따로 표시합니다.</li>
      </ul>
    </div>
  );
}

function ResultCard({
  rank,
  result,
  view,
  score,
  selected,
  onSelect,
}: {
  rank?: number;
  result: LoanStrategyResult;
  view: StrategyView;
  score?: BalancedScore;
  selected: boolean;
  onSelect: () => void;
}) {
  const { loan, status } = result;
  const ok = status === "ok";

  return (
    <section
      className={`flex flex-col rounded-2xl border bg-surface p-5 shadow-soft transition-colors md:p-6 ${
        selected ? "border-primary-strong/70" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={`num flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
              rank ? "bg-primary-soft text-primary-text" : "bg-surface-alt text-muted"
            }`}
            aria-label={rank ? `${rank}번째` : "순위 없음"}
          >
            {rank ?? "–"}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-semibold">{loan.name}</h3>
            <p className="mt-0.5 text-xs text-muted">
              {formatRate(loan)} · {loan.repaymentType === "manual" ? "일정표 기준 추정" : "예상 계산"}
            </p>
          </div>
        </div>
        {ok && <Highlight result={result} view={view} score={score} />}
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        <Row label="현재 원금">
          <Amount value={result.currentBalance} />
        </Row>
        <Row label="추가 상환">
          <Amount value={result.applied} />
          {result.leftover > 0 && result.applied > 0 && (
            <span className="num block text-right text-[11px] text-muted">남는 금액 {formatWon(result.leftover)}</span>
          )}
        </Row>
        <Row label="추가 상환 후 원금" strong>
          <Amount value={result.balanceAfter} />
        </Row>
      </dl>

      {ok ? (
        <dl className="mt-3 space-y-2 border-t pt-3 text-sm">
          <Row label="예상 완납">
            <FromTo
              from={result.basePayoff ? formatMonth(result.basePayoff) : "–"}
              to={result.paidOffNow ? "즉시 완납" : result.newPayoff ? formatMonth(result.newPayoff) : "–"}
            />
            <span className="block text-right text-[11px] text-muted">
              {result.monthsSaved > 0 ? `${result.monthsSaved}개월 단축` : "변화 없음"}
            </span>
          </Row>
          <Row label="예상 잔여 이자">
            <FromTo from={formatNumber(result.baseInterest)} to={formatNumber(result.newInterest)} />
          </Row>
          <Row label="예상 이자 절감">
            <Amount value={result.interestSaved} className="font-semibold" />
          </Row>
          {result.paymentMonth && (
            <Row label={`월 납입 (${formatMonth(result.paymentMonth)})`}>
              <FromTo from={formatNumber(result.basePayment)} to={formatNumber(result.newPayment)} />
            </Row>
          )}
          <Row label="월 부담 감소">
            {result.reliefStartMonth ? (
              <span className="num text-right">
                {formatMonth(result.reliefStartMonth)}부터 월 {formatWon(result.reliefAmount)}
              </span>
            ) : (
              <span className="text-muted">기간 내 변화 없음</span>
            )}
          </Row>
          <Row label={`향후 ${RELIEF_WINDOW}개월 납입 감소`}>
            <Amount value={result.relief24} />
          </Row>
          <Row label="중도상환수수료">
            {result.fee.known ? (
              result.fee.applies ? (
                <span className="num">
                  {formatWon(result.fee.amount)}{" "}
                  <span className="text-[11px] text-muted">
                    ({result.fee.assumed ? "가정 " : ""}
                    {result.fee.rate}%)
                  </span>
                </span>
              ) : (
                <span className="text-muted">면제 기간 지남</span>
              )
            ) : (
              <Badge>수수료 정보 미입력</Badge>
            )}
          </Row>
          {result.fee.known && result.fee.amount > 0 && (
            <Row label="수수료 차감 후 절감">
              <Amount value={result.netSaving} />
            </Row>
          )}
        </dl>
      ) : (
        <p className="mt-3 rounded-xl bg-surface-alt px-3.5 py-3 text-sm text-muted">{result.reason}</p>
      )}

      {ok && view === "balanced" && score && <ScoreBars score={score} />}

      {ok && !result.fee.known && (
        <p className="mt-3 text-[11px] text-muted">중도상환수수료는 반영되지 않은 결과입니다.</p>
      )}

      {ok && (
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={selected}
          className={`mt-4 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
            selected ? "border-primary-strong bg-primary-soft" : "text-muted hover:border-primary-strong/50 hover:text-foreground"
          }`}
        >
          {selected ? "아래에 전체 효과 표시 중" : "전체 효과 보기"}
        </button>
      )}
    </section>
  );
}

/** 선택한 관점의 핵심 수치 */
function Highlight({ result, view, score }: { result: LoanStrategyResult; view: StrategyView; score?: BalancedScore }) {
  let label: string;
  let value: ReactNode;
  switch (view) {
    case "interest":
      label = result.fee.known && result.fee.amount > 0 ? "수수료 차감 후 절감" : "이자 절감";
      value = formatManwon(result.netSaving);
      break;
    case "burden":
      label = result.reliefStartMonth
        ? `${monthsFromNow(result)}부터`
        : "월 부담";
      value = result.reliefStartMonth ? `월 ${formatManwon(result.reliefAmount)}↓` : "변화 없음";
      break;
    case "term":
      label = "완납 단축";
      value = `${result.monthsSaved}개월`;
      break;
    case "balanced":
      label = "비교 지수";
      value = `${score?.index ?? 0}`;
      break;
  }
  return (
    <div className="shrink-0 text-right">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="num text-lg font-semibold whitespace-nowrap">{value}</p>
    </div>
  );
}

function monthsFromNow(result: LoanStrategyResult): string {
  if (!result.reliefStartMonth || !result.paymentMonth) return "";
  const diff = monthDiff(result.paymentMonth, result.reliefStartMonth);
  return diff <= 0 ? "다음 납입" : formatMonth(result.reliefStartMonth);
}

function ScoreBars({ score }: { score: BalancedScore }) {
  const items = [
    { label: "이자 절감", value: score.interest },
    { label: "기간 단축", value: score.term },
    { label: `${RELIEF_WINDOW}개월 납입 감소`, value: score.burden },
  ];
  return (
    <div className="mt-3 space-y-1.5 rounded-xl bg-surface-alt px-3.5 py-3">
      {items.map((item) => (
        <div key={item.label} className="grid grid-cols-[6.5rem_1fr_2.5rem] items-center gap-2 text-[11px]">
          <span className="text-muted">{item.label}</span>
          <span className="h-1.5 overflow-hidden rounded-full bg-surface" aria-hidden>
            <span className="block h-full rounded-full bg-primary-strong/70" style={{ width: `${item.value * 100}%` }} />
          </span>
          <span className="num text-right text-muted">{Math.round(item.value * 100)}</span>
        </div>
      ))}
      <p className="pt-1 text-[10px] text-muted">후보 중 가장 큰 값을 100으로 둔 상대 비교이며, 추천 순위가 아닙니다.</p>
    </div>
  );
}

function Row({ label, strong = false, children }: { label: string; strong?: boolean; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className={`min-w-0 text-right ${strong ? "font-semibold" : ""}`}>{children}</dd>
    </div>
  );
}

function FromTo({ from, to }: { from: string; to: string }) {
  return (
    <span className="num whitespace-nowrap">
      <span className="text-muted">{from}</span> → <span className="font-medium">{to}</span>
    </span>
  );
}

function Compare({
  label,
  before,
  after,
  missingLabel = "계산할 수 없음",
}: {
  label: string;
  before: number | null;
  after: number | null;
  missingLabel?: string;
}) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 text-sm">
        {before === null || after === null ? (
          <Missing>{missingLabel}</Missing>
        ) : (
          <>
            <span className="num text-muted">{formatWon(before)}</span>
            <span className="mx-1 text-muted">→</span>
            <Amount value={after} className="font-semibold" />
          </>
        )}
      </dd>
    </div>
  );
}
