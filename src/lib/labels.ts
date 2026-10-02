import type { Loan, RepaymentType, ScheduleSource } from "@/types/finance";

export const repaymentTypeLabel: Record<RepaymentType, string> = {
  "equal-principal": "원금균등상환",
  "equal-payment": "원리금균등상환",
  "interest-only": "만기일시상환",
  manual: "상환 일정표",
};

/** 기본 정보 등에 쓰는 정식 명칭 */
export const repaymentTypeFullLabel: Record<RepaymentType, string> = {
  "equal-principal": "원금균등분할상환",
  "equal-payment": "원리금균등분할상환",
  "interest-only": "만기일시상환",
  manual: "상환 일정표",
};

export const scheduleSourceLabel: Record<ScheduleSource, string> = {
  record: "실제 기록",
  manual: "금융사 상환 일정표 기준",
  auto: "예상 계산 기준",
};

/** 금리 표기. null 은 0% 가 아니라 "금리 정보 없음" */
export function formatRate(loan: Pick<Loan, "interestRate">): string {
  if (loan.interestRate === null) return "금리 정보 없음";
  // 12 → "12.0%", 11.63 → "11.63%"
  const rate = Number.isInteger(loan.interestRate) ? loan.interestRate.toFixed(1) : String(loan.interestRate);
  return `연 ${rate}%`;
}

export const INTEREST_NOTE =
  "예상 이자는 월 단위 단순 계산값(월초 원금 × 연이율 ÷ 12)이며 실제 금융사 청구액과 차이가 있을 수 있습니다.";
export const VARIABLE_RATE_NOTE = "현재 금리가 유지된다고 가정한 예상치입니다.";
export const UNKNOWN_RATE_NOTE = "금리 정보가 없는 대출은 상환 일정표에 적힌 이자만 반영합니다.";

/** 완납월을 알 수 없을 때의 표기 — 일정표 대출은 "일정표 미완성", 자동 계산 대출은 "계산할 수 없음" */
export function payoffPendingLabel(loan: Pick<Loan, "repaymentType">): string {
  return loan.repaymentType === "manual" ? "일정표 미완성" : "계산할 수 없음";
}
