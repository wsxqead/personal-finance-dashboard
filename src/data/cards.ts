import type { Card } from "@/types/finance";

/**
 * 카드 목록.
 * outstandingBalance(미결제 금액)는 대출이 아니므로 대출 잔액·상환률·완납월·이자에 포함하지 않고,
 * 대시보드의 "총 금융부담"(대출 잔액 + 카드 미결제 금액)에만 더합니다.
 */
export const cards: Card[] = [
  {
    id: "shinhan-card",
    name: "신한카드",
    issuer: "신한카드",

    originalUsedAmount: 3_740_000,
    outstandingBalance: 2_529_600,

    paymentDay: 27,
    currentPayment: 777_074,
  },
  { id: "card-sub", name: "구독 카드", issuer: "롯데 카드", paymentDay: 25, expectedMonthly: 40_000 },
];
