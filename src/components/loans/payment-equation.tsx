import { Amount } from "@/components/ui/amount";
import { Missing } from "@/components/ui/missing";

interface PaymentEquationProps {
  principal: number;
  interest: number;
  /** 납입 후 잔액 (선택) */
  balanceAfter?: number;
  interestEstimated?: boolean;
  /** 원금 미입력 */
  principalMissing?: boolean;
  /** 이자 미입력 */
  interestUnknown?: boolean;
  size?: "md" | "sm";
}

/** 원금 + 이자 = 총 납입금 을 세로 수식 형태로 보여줍니다. */
export function PaymentEquation({
  principal,
  interest,
  balanceAfter,
  interestEstimated = true,
  principalMissing = false,
  interestUnknown = false,
  size = "md",
}: PaymentEquationProps) {
  const text = size === "md" ? "text-sm" : "text-[13px]";
  return (
    <dl className={`space-y-2 ${text}`}>
      <div className="flex items-baseline justify-between gap-3">
        <dt className="text-muted">원금</dt>
        <dd>{principalMissing ? <Missing /> : <Amount value={principal} />}</dd>
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <dt className="text-muted">
          <span aria-hidden className="mr-1.5 inline-block w-3 text-center">+</span>
          이자
          {!interestUnknown && interestEstimated && <span className="ml-1 text-[11px]">(예상)</span>}
        </dt>
        <dd>{interestUnknown ? <Missing /> : <Amount value={interest} />}</dd>
      </div>
      <div className="flex items-baseline justify-between gap-3 border-t pt-2 font-semibold">
        <dt>
          <span aria-hidden className="mr-1.5 inline-block w-3 text-center text-muted">=</span>
          총 납입금
        </dt>
        <dd>{principalMissing || interestUnknown ? <Missing /> : <Amount value={principal + interest} />}</dd>
      </div>
      {balanceAfter !== undefined && (
        <div className="flex items-baseline justify-between gap-3 pt-1">
          <dt className="text-muted">납입 후 잔액</dt>
          <dd>
            <Amount value={balanceAfter} />
          </dd>
        </div>
      )}
    </dl>
  );
}
