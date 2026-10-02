import type { ManualPayment } from "@/types/finance";

/**
 * 한화저축은행 상환 일정표 (금융사 제공 일정표를 옮겨 적습니다).
 *
 * - month 순서대로, 같은 달은 한 번만 적습니다.
 * - principal(원금)과 interest(이자)는 일정표 금액 그대로 적습니다. 총 납입액은 자동 계산됩니다.
 * - 선택: paymentDate(납부 예정일), remainingPrincipal(일정표상 납입 후 잔액), note
 * - 실제로 납입이 끝난 달은 monthly-records.ts 가 우선하므로, 지난 달 항목은 지워도 됩니다.
 * - 아래는 빈 템플릿입니다. null 은 "미입력", 0 은 "실제 0원"입니다. 미입력 달은 추정하지 않고 "미입력"으로 표시됩니다.
 */
export const hanwhaSchedule: ManualPayment[] = [
  { month: "2026-11", installment: 15, principal: 281_725, interest: 107_270 },
  { month: "2026-12", installment: 16, principal: 287_774, interest: 101_221 },

  { month: "2027-01", installment: 17, principal: 287_132, interest: 101_863 },
  { month: "2027-02", installment: 18, principal: 289_859, interest: 99_136 },
  { month: "2027-03", installment: 19, principal: 301_938, interest: 87_057 },
  { month: "2027-04", installment: 20, principal: 295_478, interest: 93_517 },
  { month: "2027-05", installment: 21, principal: 301_210, interest: 87_785 },
  { month: "2027-06", installment: 22, principal: 301_144, interest: 87_851 },
  { month: "2027-07", installment: 23, principal: 306_745, interest: 82_250 },
  { month: "2027-08", installment: 24, principal: 306_916, interest: 82_079 },
  { month: "2027-09", installment: 25, principal: 309_830, interest: 79_165 },
  { month: "2027-10", installment: 26, principal: 315_231, interest: 73_764 },
  { month: "2027-11", installment: 27, principal: 315_765, interest: 73_230 },
  { month: "2027-12", installment: 28, principal: 321_029, interest: 67_966 },

  { month: "2028-01", installment: 29, principal: 321_835, interest: 67_160 },
  { month: "2028-02", installment: 30, principal: 325_043, interest: 63_952 },
  { month: "2028-03", installment: 31, principal: 332_048, interest: 56_947 },
  { month: "2028-04", installment: 32, principal: 331_265, interest: 57_730 },
  { month: "2028-05", installment: 33, principal: 336_163, interest: 52_832 },
  { month: "2028-06", installment: 34, principal: 337_585, interest: 51_410 },
  { month: "2028-07", installment: 35, principal: 342_337, interest: 46_658 },
  { month: "2028-08", installment: 36, principal: 344_024, interest: 44_971 },
  { month: "2028-09", installment: 37, principal: 347_282, interest: 41_713 },
  { month: "2028-10", installment: 38, principal: 351_810, interest: 37_185 },
  { month: "2028-11", installment: 39, principal: 353_901, interest: 35_094 },
  { month: "2028-12", installment: 40, principal: 358_277, interest: 30_718 },

  { month: "2029-01", installment: 41, principal: 360_635, interest: 28_360 },
  { month: "2029-02", installment: 42, principal: 363_992, interest: 25_003 },
  { month: "2029-03", installment: 43, principal: 369_534, interest: 19_461 },
  { month: "2029-04", installment: 44, principal: 370_957, interest: 18_038 },
  { month: "2029-05", installment: 45, principal: 374_948, interest: 14_047 },
  { month: "2029-06", installment: 46, principal: 378_040, interest: 10_955 },
  { month: "2029-07", installment: 47, principal: 381_867, interest: 7_128 },
  { month: "2029-08", installment: 48, principal: 393_893, interest: 3_619 },
];
