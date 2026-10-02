import { ArrowDownCircle, CircleCheck, Flag, PlusCircle, RefreshCw, TrendingUp, type LucideIcon } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/dates";
import { formatWon } from "@/lib/format";
import type { FinanceEvent, FinanceEventType } from "@/types/finance";

const eventMeta: Record<FinanceEventType, { label: string; icon: LucideIcon; tone: BadgeTone }> = {
  "new-loan": { label: "신규 대출", icon: PlusCircle, tone: "increase" },
  "extra-repayment": { label: "추가 상환", icon: ArrowDownCircle, tone: "primary" },
  "paid-off": { label: "완납", icon: CircleCheck, tone: "primary" },
  "term-change": { label: "조건 변경", icon: RefreshCw, tone: "neutral" },
  "income-change": { label: "수입 변화", icon: TrendingUp, tone: "neutral" },
  other: { label: "기록", icon: Flag, tone: "neutral" },
};

const iconToneClass: Record<BadgeTone, string> = {
  primary: "bg-primary-soft text-primary-text",
  increase: "bg-increase-soft text-increase",
  neutral: "bg-surface-alt text-muted",
};

interface FinanceEventsProps {
  events: FinanceEvent[];
  /** 최근 n개만 표시 */
  limit?: number;
  title?: string;
}

export function FinanceEvents({ events, limit, title = "재무 이벤트" }: FinanceEventsProps) {
  const sorted = [...events].sort((a, b) => b.date.localeCompare(a.date));
  const visible = limit ? sorted.slice(0, limit) : sorted;

  return (
    <Card title={title} description="부채가 늘거나 줄어든 이유">
      {visible.length === 0 ? (
        <p className="text-sm text-muted">아직 기록된 이벤트가 없습니다.</p>
      ) : (
        <ol className="relative space-y-5">
          {visible.map((event, index) => {
            const meta = eventMeta[event.type];
            const Icon = meta.icon;
            return (
              <li key={`${event.date}-${event.title}`} className="relative flex gap-3.5">
                {index < visible.length - 1 && (
                  <span className="absolute top-9 bottom-[-1.25rem] left-4 w-px bg-border" aria-hidden />
                )}
                <span
                  className={`relative flex size-8 shrink-0 items-center justify-center rounded-full ${iconToneClass[meta.tone]}`}
                >
                  <Icon className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-medium">{event.title}</span>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-muted">
                    <time dateTime={event.date}>{formatDate(event.date)}</time>
                    {event.amount !== undefined && <span className="num">{formatWon(event.amount)}</span>}
                  </div>
                  {event.description && (
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{event.description}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
