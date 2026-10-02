import type { FixedExpense } from "@/types/finance";

export const fixedExpenses: FixedExpense[] = [
  {
    id: "phone",
    name: "통신비",
    category: "telecom",
    amount: 115_000,
    dueDay: 20,
  },
  {
    id: "insurance",
    name: "보험료",
    category: "insurance",
    amount: 180_000,
    dueDay: 10,
  },
  {
    id: "subscriptions",
    name: "구독 서비스",
    category: "subscription",
    amount: 27_000,
    dueDay: 1,
  },
  {
    id: "transit",
    name: "교통비",
    category: "transport",
    amount: 60_000,
    dueDay: 1,
  },
  {
    id: "parents",
    name: "생활비",
    category: "family",
    amount: 1_200_000,
    dueDay: 5,
  },
];
