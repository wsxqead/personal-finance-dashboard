import type { FinancePlan } from "@/types/finance";

/**
 * 앞으로의 계획.
 * 대출별 정기 상환은 loans.ts 와 schedules/ 의 금융사 상환 일정표를 따릅니다.
 * 여기에는 정기 상환과 별도로 계획한 추가 상환, 그리고 현금흐름 예상에 쓰는 수입/지출 가정을 둡니다.
 *
 * monthlyIncome / monthlyLivingExpenses 의 null 은 "미입력"입니다.
 * 미입력이면 화면에 "미입력"으로 표시하고, 예상 잔액은 계산하지 않습니다.
 */
export const plan: FinancePlan = {
  monthlyIncome: null,
  monthlyLivingExpenses: null,
  // 예: { month: "2027-01", loanId: "loan-korea-investment", amount: 1_000_000, memo: "상여금" }
  extraRepayments: [],
  horizonMonths: 12,
};
