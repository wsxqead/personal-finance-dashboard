import type { ManualPayment } from "@/types/finance";

/**
 * 전북은행 상환 일정표 (금융사 상환 예정표 기준, 월 납입 111,121원 고정).
 *
 * - month 순서대로, 같은 달은 한 번만 적습니다.
 * - principal(원금)과 interest(이자)는 일정표 금액 그대로 적습니다. 총 납입액은 자동 계산됩니다.
 * - installment 는 금융사 일정표의 회차입니다. (화면에 "11회차"로 표시)
 * - null 은 "미입력", 0 은 "실제 0원"입니다.
 * - 일정표 첫 달보다 앞선 달은 납입이 없는 것으로 봅니다. (10회차까지 납입 완료, 다음 납부는 11회차)
 * - 실제로 납입이 끝난 달은 monthly-records.ts 가 우선하므로, 지난 달 항목은 지워도 됩니다.
 */
export const jeonbukSchedule: ManualPayment[] = [
  { month: "2026-11", installment: 11, principal: 67_566, interest: 43_555 },
  { month: "2026-12", installment: 12, principal: 68_242, interest: 42_879 },

  { month: "2027-01", installment: 13, principal: 68_924, interest: 42_197 },
  { month: "2027-02", installment: 14, principal: 69_614, interest: 41_507 },
  { month: "2027-03", installment: 15, principal: 70_310, interest: 40_811 },
  { month: "2027-04", installment: 16, principal: 71_013, interest: 40_108 },
  { month: "2027-05", installment: 17, principal: 71_723, interest: 39_398 },
  { month: "2027-06", installment: 18, principal: 72_440, interest: 38_681 },
  { month: "2027-07", installment: 19, principal: 73_165, interest: 37_956 },
  { month: "2027-08", installment: 20, principal: 73_896, interest: 37_225 },
  { month: "2027-09", installment: 21, principal: 74_635, interest: 36_486 },
  { month: "2027-10", installment: 22, principal: 75_382, interest: 35_739 },
  { month: "2027-11", installment: 23, principal: 76_135, interest: 34_986 },
  { month: "2027-12", installment: 24, principal: 76_897, interest: 34_224 },

  { month: "2028-01", installment: 25, principal: 77_666, interest: 33_455 },
  { month: "2028-02", installment: 26, principal: 78_442, interest: 32_679 },
  { month: "2028-03", installment: 27, principal: 79_227, interest: 31_894 },
  { month: "2028-04", installment: 28, principal: 80_019, interest: 31_102 },
  { month: "2028-05", installment: 29, principal: 80_819, interest: 30_302 },
  { month: "2028-06", installment: 30, principal: 81_627, interest: 29_494 },
  { month: "2028-07", installment: 31, principal: 82_444, interest: 28_677 },
  { month: "2028-08", installment: 32, principal: 83_268, interest: 27_853 },
  { month: "2028-09", installment: 33, principal: 84_101, interest: 27_020 },
  { month: "2028-10", installment: 34, principal: 84_942, interest: 26_179 },
  { month: "2028-11", installment: 35, principal: 85_791, interest: 25_330 },
  { month: "2028-12", installment: 36, principal: 86_649, interest: 24_472 },

  { month: "2029-01", installment: 37, principal: 87_516, interest: 23_605 },
  { month: "2029-02", installment: 38, principal: 88_391, interest: 22_730 },
  { month: "2029-03", installment: 39, principal: 89_275, interest: 21_846 },
  { month: "2029-04", installment: 40, principal: 90_167, interest: 20_954 },
  { month: "2029-05", installment: 41, principal: 91_069, interest: 20_052 },
  { month: "2029-06", installment: 42, principal: 91_980, interest: 19_141 },
  { month: "2029-07", installment: 43, principal: 92_900, interest: 18_221 },
  { month: "2029-08", installment: 44, principal: 93_829, interest: 17_292 },
  { month: "2029-09", installment: 45, principal: 94_767, interest: 16_354 },
  { month: "2029-10", installment: 46, principal: 95_715, interest: 15_406 },
  { month: "2029-11", installment: 47, principal: 96_672, interest: 14_449 },
  { month: "2029-12", installment: 48, principal: 97_638, interest: 13_483 },

  { month: "2030-01", installment: 49, principal: 98_615, interest: 12_506 },
  { month: "2030-02", installment: 50, principal: 99_601, interest: 11_520 },
  { month: "2030-03", installment: 51, principal: 100_597, interest: 10_524 },
  { month: "2030-04", installment: 52, principal: 101_603, interest: 9_518 },
  { month: "2030-05", installment: 53, principal: 102_619, interest: 8_502 },
  { month: "2030-06", installment: 54, principal: 103_645, interest: 7_476 },
  { month: "2030-07", installment: 55, principal: 104_682, interest: 6_439 },
  { month: "2030-08", installment: 56, principal: 105_728, interest: 5_393 },
  { month: "2030-09", installment: 57, principal: 106_786, interest: 4_335 },
  { month: "2030-10", installment: 58, principal: 107_854, interest: 3_267 },
  { month: "2030-11", installment: 59, principal: 108_932, interest: 2_189 },
  { month: "2030-12", installment: 60, principal: 110_004, interest: 1_117 },
];
