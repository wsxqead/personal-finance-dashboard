import type { Profile } from "@/types/finance";

export const profile: Profile = {
  title: "부채 기록장",
  owner: "나",
  // loans.ts 의 openingBalance 는 이 달 초 기준 잔액입니다. monthly-records.ts 의 첫 기록도 이 달부터 시작합니다.
  trackingStartMonth: "2026-10",
};
