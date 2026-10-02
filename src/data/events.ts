import type { FinanceEvent } from "@/types/finance";

/**
 * 부채가 왜 늘거나 줄었는지 남겨두는 이벤트 기록.
 *
 * 예시:
 * {
 *   date: "2026-10-15",
 *   type: "extra-repayment", // new-loan | extra-repayment | paid-off | term-change | income-change | other
 *   amount: 1_000_000,
 *   loanId: "loan-korea-investment",
 *   title: "한국투자저축은행 추가 상환",
 *   description: "상여금으로 원금 일부를 먼저 갚음",
 * },
 */
export const financeEvents: FinanceEvent[] = [];
