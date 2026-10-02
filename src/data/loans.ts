import type { Loan } from "@/types/finance";
import { koreaInvestmentSchedule } from "./schedules/korea-investment";
import { hanwhaSchedule } from "./schedules/hanwha";
import { jeonbukSchedule } from "./schedules/jeonbuk";

/**
 * 대출 목록.
 *
 * - openingBalance: profile.ts 의 trackingStartMonth(기록 시작 월) 초 기준 잔액
 * - 현재 잔액은 저장하지 않습니다. monthly-records.ts 의 원금 상환으로 계산됩니다.
 * - startedAt 의 "" 와 paymentDay 의 0 은 "미입력"으로 처리합니다.
 * - maturityMonth 는 계약상 만기 월(YYYY-MM)입니다. manual 대출에서는 계산에 쓰지 않고
 *   "계약 만기" 표시와 일정표 검증(만기 이후 항목, 만기까지 원금이 남는지)에만 씁니다.
 * - interestRate 의 null 은 "금리 정보 없음"이며 0% 와 다릅니다.
 * - 카드 미결제 금액은 대출이 아니므로 여기가 아니라 cards.ts 에 적습니다.
 *
 * 미래 상환 예상의 우선순위
 *   1. monthly-records.ts 의 실제 납입 기록
 *   2. schedule — src/data/schedules/ 의 금융사 상환 일정표
 *   3. repaymentType 에 따른 자동 계산 (일정표가 없거나 끝난 뒤)
 *
 * 자동 계산을 쓰려면 repaymentType 과 필요한 값을 입력합니다.
 * - equal-principal: monthlyPrincipal 또는 maturityMonth
 * - equal-payment:   monthlyPayment 또는 maturityMonth
 * - interest-only:   maturityMonth
 * - manual:          일정표만 사용 (일정표 이후에는 monthlyPrincipal 이 있으면 적용)
 */
export const loans: Loan[] = [
  {
    id: "loan-korea-investment",
    name: "한국투자저축은행 대출",
    lender: "한국투자저축은행",
    category: "신용대출",

    originalAmount: 30_000_000,
    openingBalance: 20_436_034,

    interestRate: 11.63,
    variableRate: true,

    repaymentType: "manual",

    startedAt: "",
    maturityMonth: "2029-05",
    paymentDay: 25,

    // 중도상환수수료: 확인 전이라 2% 가정 (실행일 미확인 — 면제 종료월 없이 항상 적용)
    prepaymentFeeRate: 2,
    prepaymentFeeAssumed: true,

    monthlyPrincipal: undefined,
    monthlyPayment: undefined,

    schedule: koreaInvestmentSchedule,
  },

  {
    id: "loan-hanwha",
    name: "한화저축은행 대출",
    lender: "한화저축은행",
    category: "신용대출",

    originalAmount: 15_000_000,
    openingBalance: 11_297_212,

    interestRate: 11.18,
    variableRate: true,

    repaymentType: "manual",

    startedAt: "2025-09-05",
    maturityMonth: "2029-08",
    paymentDay: 5,

    // 중도상환수수료: 확인 전이라 2% 가정 (실행 후 3년간 부과 → 2028-08까지)
    prepaymentFeeRate: 2,
    prepaymentFeeEndMonth: "2028-08",
    prepaymentFeeAssumed: true,

    monthlyPrincipal: undefined,
    monthlyPayment: undefined,

    schedule: hanwhaSchedule,
  },

  {
    id: "loan-jeonbuk",
    name: "전북은행 대출",
    lender: "전북은행",
    category: "신용대출",

    originalAmount: 5_000_000,
    openingBalance: 4_355_522,

    interestRate: 12,
    variableRate: true,

    repaymentType: "manual",

    startedAt: "2025-12-15",
    maturityMonth: "2030-12",
    paymentDay: 15,

    // 중도상환수수료: 확인 전이라 2% 가정 (실행 후 3년간 부과 → 2028-11까지)
    prepaymentFeeRate: 2,
    prepaymentFeeEndMonth: "2028-11",
    prepaymentFeeAssumed: true,

    monthlyPrincipal: undefined,
    // manual 대출에서는 계산에 쓰지 않고 "월 정기 납입" 참고값으로만 표시
    monthlyPayment: 111_121,

    schedule: jeonbukSchedule,
  },

  {
    id: "loan-db",
    name: "DB 신용대출",
    lender: "DB",
    category: "신용대출",

    originalAmount: 6_000_000,
    // 2026년 10월분 납입 후 실제 잔액 (과거 회차를 공식으로 재현하지 않고 이 값을 기준점으로 사용)
    openingBalance: 4_806_010,

    interestRate: 11.7,
    variableRate: true,

    // 금융사 월별 예정표가 없어 원리금균등으로 자동 계산
    repaymentType: "equal-payment",

    startedAt: "2026-01-06",
    maturityMonth: "2029-01",
    paymentDay: 2,

    // 계약 기간 36개월. 1회차 월은 확인 전이라 비워 두고,
    // 남은 회차는 paidThroughMonth 다음 달 ~ 계약 만기월(2026-11 ~ 2029-01, 27회)로 계산
    totalInstallments: 36,
    paidThroughMonth: "2026-10",

    // 중도상환수수료: 확인 전이라 2% 가정 (실행 후 3년간 부과 → 2028-12까지)
    prepaymentFeeRate: 2,
    prepaymentFeeEndMonth: "2028-12",
    prepaymentFeeAssumed: true,

    monthlyPrincipal: undefined,
    monthlyPayment: undefined,

    // 금융사 상환 예정표 없음 — 자동 계산 사용
    schedule: [],
  },

  {
    id: "loan-ok",
    name: "OK저축은행 대출",
    lender: "OK저축은행",
    category: "신용대출",

    originalAmount: 6_000_000,
    // 2026년 10월분(6회차) 납입 후 실제 잔액 — 과거 회차를 공식으로 역산하지 않고 기준점으로 사용
    openingBalance: 5_077_536,

    interestRate: 13.44,
    variableRate: true,

    // 금융사 상환 예정표가 없어 원리금균등으로 자동 계산
    repaymentType: "equal-payment",

    startedAt: "2026-04-17",
    maturityMonth: "2029-04",
    paymentDay: 17,

    // 1회차 2026-05 ~ 36회차 2029-04 (계약 만기)
    firstPaymentMonth: "2026-05",
    totalInstallments: 36,
    paidThroughMonth: "2026-10",

    // 중도상환수수료: 확인 전이라 2% 가정 (실행 후 3년간 부과 → 2029-03까지)
    prepaymentFeeRate: 2,
    prepaymentFeeEndMonth: "2029-03",
    prepaymentFeeAssumed: true,

    monthlyPrincipal: undefined,
    monthlyPayment: undefined,

    // 금융사 상환 예정표 없음 — 자동 계산 사용
    schedule: [],
  },

  {
    id: "loan-daol",
    name: "다올저축은행 대출",
    lender: "다올저축은행",
    category: "신용대출",

    originalAmount: 3_000_000,
    openingBalance: 2_669_494,

    interestRate: 13.91,
    variableRate: true,

    repaymentType: "equal-payment",

    startedAt: "2026-07-01",
    maturityMonth: "2028-07",
    paymentDay: 1,

    // 금융사 월별 예정표가 없어 원리금균등으로 자동 계산
    // 2026-07-01 실행, 총 24회, 계약 만기 2028-07 → 1회차 2026-08 ~ 24회차 2028-07
    firstPaymentMonth: "2026-08",
    totalInstallments: 24,
    // 2026-10(3회차)까지 납입 완료 — openingBalance 2,669,494원은 10월 납입 후 잔액
    paidThroughMonth: "2026-10",

    // 중도상환수수료: 확인 전이라 2% 가정 (실행 후 3년간 부과 → 2029-06까지)
    prepaymentFeeRate: 2,
    prepaymentFeeEndMonth: "2029-06",
    prepaymentFeeAssumed: true,

    monthlyPrincipal: undefined,
    monthlyPayment: undefined,

    // 금융사 상환 예정표 없음 — 자동 계산 사용
    schedule: [],
  },

  {
    id: "loan-acuon",
    name: "에큐온저축은행 대출",
    lender: "에큐온저축은행",
    category: "신용대출",

    originalAmount: 6_000_000,
    openingBalance: 6_000_000,

    interestRate: 13.9,
    variableRate: true,

    repaymentType: "equal-payment",

    startedAt: "2026-09-29",
    maturityMonth: "2030-10",
    paymentDay: 1,

    // 금융사 월별 예정표가 없어 원리금균등으로 자동 계산
    // 2026-09-29 실행, 1회차 2026-11-01, 총 48회 → 48회차 2030-10 (계약 만기)
    firstPaymentMonth: "2026-11",
    totalInstallments: 48,

    // 중도상환수수료: 확인 전이라 2% 가정 (실행 후 3년간 부과 → 2029-08까지)
    prepaymentFeeRate: 2,
    prepaymentFeeEndMonth: "2029-08",
    prepaymentFeeAssumed: true,

    monthlyPrincipal: undefined,
    monthlyPayment: undefined,

    // 금융사 상환 예정표 없음 — 자동 계산 사용
    schedule: [],
  },
];
