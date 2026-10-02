import type { MonthlyRecordInput } from "@/types/finance";

/**
 * 월별 실제 기록.
 * 한 달이 끝나고 납입이 확정되면 맨 아래에 한 항목씩 추가하세요.
 * 첫 기록은 profile.ts 의 trackingStartMonth 달이어야 하고, 월은 빠짐없이 이어져야 합니다.
 * 실제 기록이 있는 달은 상환 일정표·자동 계산보다 항상 우선합니다.
 *
 * 예시:
 * {
 *   month: "2026-10",
 *   income: 0,
 *   loanPayments: {
 *     "loan-korea-investment": { principal: 0, interest: 0 },
 *     "loan-hanwha": { principal: 0, interest: 0 },
 *   },
 *   cardPayments: { "shinhan-card": 0, "card-sub": 0 },
 *   livingExpenses: 0,
 *   review: "한 줄 회고",
 * },
 */
export const monthlyRecords: MonthlyRecordInput[] = [];
