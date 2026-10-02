import type { ManualPayment } from "@/types/finance";

/**
 * 한국투자저축은행 상환 일정표 (금융사 제공 일정표를 옮겨 적습니다).
 *
 * - month 순서대로, 같은 달은 한 번만 적습니다.
 * - principal(원금)과 interest(이자)는 일정표 금액 그대로 적습니다. 총 납입액은 자동 계산됩니다.
 * - 선택: paymentDate(납부 예정일), remainingPrincipal(일정표상 납입 후 잔액), note
 * - 실제로 납입이 끝난 달은 monthly-records.ts 가 우선하므로, 지난 달 항목은 지워도 됩니다.
 * - 아래는 빈 템플릿입니다. null 은 "미입력", 0 은 "실제 0원"입니다. 미입력 달은 추정하지 않고 "미입력"으로 표시됩니다.
 */
export const koreaInvestmentSchedule: ManualPayment[] = [
  { month: "2026-11", installment: 20, principal: 564_453, interest: 201_857 },
  { month: "2026-12", installment: 21, principal: 576_360, interest: 189_950 },

  { month: "2027-01", installment: 22, principal: 575_721, interest: 190_589 },
  { month: "2027-02", installment: 23, principal: 581_408, interest: 184_902 },
  { month: "2027-03", installment: 24, principal: 604_489, interest: 161_821 },
  { month: "2027-04", installment: 25, principal: 593_122, interest: 173_188 },
  { month: "2027-05", installment: 26, principal: 604_378, interest: 161_932 },
  { month: "2027-06", installment: 27, principal: 604_950, interest: 161_360 },
  { month: "2027-07", installment: 28, principal: 615_938, interest: 150_372 },
  { month: "2027-08", installment: 29, principal: 617_009, interest: 149_301 },
  { month: "2027-09", installment: 30, principal: 623_104, interest: 143_206 },
  { month: "2027-10", installment: 31, principal: 633_680, interest: 132_630 },
  { month: "2027-11", installment: 32, principal: 635_518, interest: 130_792 },
  { month: "2027-12", installment: 33, principal: 645_812, interest: 120_498 },

  { month: "2028-01", installment: 34, principal: 648_424, interest: 117_886 },
  { month: "2028-02", installment: 35, principal: 654_884, interest: 111_426 },
  { month: "2028-03", installment: 36, principal: 668_108, interest: 98_202 },
  { month: "2028-04", installment: 37, principal: 667_917, interest: 98_393 },
  { month: "2028-05", installment: 38, principal: 677_458, interest: 88_852 },
  { month: "2028-06", installment: 39, principal: 681_169, interest: 85_141 },
  { month: "2028-07", installment: 40, principal: 690_409, interest: 75_901 },
  { month: "2028-08", installment: 41, principal: 694_680, interest: 74_630 },
  { month: "2028-09", installment: 42, principal: 701_523, interest: 64_787 },
  { month: "2028-10", installment: 43, principal: 710_300, interest: 56_010 },
  { month: "2028-11", installment: 44, principal: 715_430, interest: 50_880 },
  { month: "2028-12", installment: 45, principal: 723_892, interest: 42_418 },

  { month: "2029-01", installment: 46, principal: 729_531, interest: 36_779 },
  { month: "2029-02", installment: 47, principal: 736_714, interest: 29_596 },
  { month: "2029-03", installment: 48, principal: 746_151, interest: 20_159 },
  { month: "2029-04", installment: 49, principal: 751_361, interest: 14_949 },
  { month: "2029-05", installment: 50, principal: 762_141, interest: 6_799 },
];
