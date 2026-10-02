/** "YYYY-MM" 형식의 월. 예: "2026-10" */
export type YearMonth = string;

/** "YYYY-MM-DD" 형식의 날짜. 예: "2026-03-14" */
export type DateString = string;

/* ------------------------------------------------------------------ */
/* 입력 데이터 (src/data/*.ts 에서 직접 작성하는 값)                    */
/* ------------------------------------------------------------------ */

export type LoanCategory = "신용대출" | "주택담보대출" | "전세대출" | "카드론" | "할부" | "기타";

export type RepaymentType =
  | "equal-principal" // 원금균등상환
  | "equal-payment" // 원리금균등상환
  | "interest-only" // 만기일시상환 (매달 이자만, 만기에 원금 전액)
  | "manual"; // 실제 상환 계획을 직접 지정

/**
 * 금융사 상환 일정표의 한 달 (src/data/schedules/*.ts).
 * 총 납입액은 principal + interest 로 계산하므로 따로 적지 않습니다.
 *
 * null = 아직 입력하지 않음, 0 = 실제로 0원.
 * - manual 대출: 미입력 달은 "미입력"으로 표시하고 추정하지 않습니다.
 * - 자동 계산 대출: 입력된 값만 자동 계산을 덮어쓰고, null 인 값은 자동 계산을 사용합니다.
 */
export interface ManualPayment {
  month: YearMonth;
  /** 예정 원금 상환액 (null = 미입력) */
  principal: number | null;
  /** 예정 이자 (null = 미입력) */
  interest: number | null;
  /** 금융사 일정표의 회차 (화면에 "13회차"로 표시) */
  installment?: number;
  /** 실제 납부 예정일 (YYYY-MM-DD) — 표시용 */
  paymentDate?: DateString;
  /** 일정표에 적힌 납입 후 잔액 — 표시·대조용 (계산에는 쓰지 않음) */
  remainingPrincipal?: number;
  note?: string;
}

export interface Loan {
  id: string;
  name: string;
  lender: string;
  category: LoanCategory;
  repaymentType: RepaymentType;
  /**
   * 연 이자율(%) — 현재 적용 중인 금리.
   * null 은 "금리 정보 없음"이며 0% 와 다릅니다. 이 경우 이자는 상환 일정표 값만 사용합니다.
   */
  interestRate: number | null;
  /** 변동금리 여부 (예상 이자 안내 문구에 사용) */
  variableRate?: boolean;
  /** 최초 대출금 */
  originalAmount: number;
  /**
   * 대출 시작일 (YYYY-MM-DD). 비워 두면("") 기록 시작 전부터 있던 대출로 봅니다.
   * 기록 시작 월 이후라면 해당 월의 "신규 대출"로 집계됩니다.
   */
  startedAt?: DateString;
  /**
   * 기록 시작 시점의 잔액. 기록 이전에 이미 일부 상환한 대출일 때만 입력합니다.
   * 생략하면 originalAmount 를 사용합니다.
   */
  openingBalance?: number;
  /**
   * 계약상 만기 월 (YYYY-MM). 비워 두면("") 미입력. 일자를 모르면 월만 적습니다.
   * - 자동 계산 대출: 남은 납입 횟수 계산에 쓰고, 만기 월에 남은 원금을 모두 상환하는 것으로 계산
   * - manual 대출: 계산에 쓰지 않고 "계약 만기" 표시와 일정표 검증(경고)에만 사용
   */
  maturityMonth?: YearMonth;
  /** 월 납입일 (매월 n일). 0 이면 미입력 */
  paymentDay?: number;
  /**
   * 1회차 납입 월 (YYYY-MM). totalInstallments 와 함께 쓰면
   * 자동 계산 대출의 남은 회차를 "총 회차 − 지난 회차"로 계산하고 회차 번호를 표시합니다 (만기월보다 우선).
   */
  firstPaymentMonth?: YearMonth;
  /** 총 상환 회차 */
  totalInstallments?: number;
  /**
   * 이 달 납입분까지 openingBalance 에 이미 반영되어 있음 (YYYY-MM).
   * 예상 계산은 그다음 달부터 시작하고, 그 사이 달은 "납입 없음"으로 봅니다.
   */
  paidThroughMonth?: YearMonth;
  /**
   * 월 원금 상환액.
   * - equal-principal: 생략하면 "남은 원금 ÷ 만기까지 남은 개월 수"로 계산
   * - manual: 수동 스케줄이 끝난 뒤 적용할 월 원금 (생략하면 원금 상환 없음)
   */
  monthlyPrincipal?: number;
  /**
   * 월 납입액(원금+이자).
   * - equal-payment: 자동 계산에 사용 (생략하면 원리금균등 공식으로 계산)
   * - manual: 계산에는 쓰지 않고 화면의 "월 정기 납입" 참고값으로만 표시
   */
  monthlyPayment?: number;
  /** 금융사 상환 일정표 (src/data/schedules/) — 해당 월은 자동 계산보다 우선 */
  schedule?: ManualPayment[];
  note?: string;
}

/** 특정 대출에 대한 한 달 동안의 실제 납입/추가 인출 */
export interface LoanPayment {
  principal: number;
  interest: number;
  /** 마이너스통장 등 기존 대출의 추가 인출액 */
  borrowed?: number;
}

/**
 * 월별 실제 기록 (입력값).
 * 기초/기말 부채, 원금 합계 등은 계산으로 만들어지므로 여기에 적지 않습니다.
 */
export interface MonthlyRecordInput {
  month: YearMonth;
  income: number;
  /** loanId → 해당 월 납입 내역 */
  loanPayments: Record<string, LoanPayment>;
  /** cardId → 해당 월 결제액 */
  cardPayments: Record<string, number>;
  /** 생략하면 fixed-expenses.ts 기준으로 계산합니다. 실제 금액이 다를 때만 입력하세요. */
  fixedExpenses?: number;
  livingExpenses: number;
  /** 한 달 회고 */
  review?: string;
  note?: string;
}

export type FinanceEventType =
  | "new-loan"
  | "extra-repayment"
  | "paid-off"
  | "term-change"
  | "income-change"
  | "other";

export interface FinanceEvent {
  date: DateString;
  type: FinanceEventType;
  /** 이벤트와 관련된 금액 (없으면 생략) */
  amount?: number;
  title: string;
  description?: string;
  loanId?: string;
}

/**
 * 카드. 카드 미결제 금액은 대출이 아니므로 대출 잔액·상환률·완납월·이자 계산에 넣지 않고,
 * 대시보드의 "총 금융부담"에만 더합니다.
 */
export interface Card {
  id: string;
  name: string;
  issuer: string;
  /** 결제일 (매월 n일) */
  paymentDay: number;
  /** 이번 결제일에 낼 금액 (알고 있을 때) */
  currentPayment?: number;
  /** 계획에 쓰는 월 예상 결제액. 생략하면 currentPayment 를 사용 */
  expectedMonthly?: number;
  /** 할부 등으로 처음 이용한 금액 */
  originalUsedAmount?: number;
  /** 아직 결제되지 않고 남은 금액 (할부 잔액 포함) */
  outstandingBalance?: number;
  note?: string;
}

export type FixedExpenseCategory =
  | "housing"
  | "telecom"
  | "insurance"
  | "subscription"
  | "transport"
  | "family"
  | "other";

export interface FixedExpense {
  id: string;
  name: string;
  category: FixedExpenseCategory;
  amount: number;
  /** 납부일 (매월 n일) */
  dueDay?: number;
  /** 적용 시작 월 (생략 시 처음부터) */
  startMonth?: YearMonth;
  /** 적용 종료 월 (생략 시 계속) */
  endMonth?: YearMonth;
}

export interface PlannedRepayment {
  month: YearMonth;
  loanId: string;
  amount: number;
  memo?: string;
}

/**
 * 앞으로의 현금흐름 계획.
 * 대출별 정기 상환 조건은 loans.ts 에 있고, 여기에는 계획된 추가 상환과 수입/지출 가정만 둡니다.
 */
export interface FinancePlan {
  /** 월 수입 (null = 미입력, 화면에 "미입력"으로 표시) */
  monthlyIncome: number | null;
  /** 월 생활비 (null = 미입력) */
  monthlyLivingExpenses: number | null;
  /** 생략하면 cards.ts 의 월 예상 결제액(expectedMonthly, 없으면 currentPayment) 합계를 사용합니다. */
  monthlyCardPayment?: number;
  /** 정기 상환과 별도로 계획된 추가(중도) 상환 */
  extraRepayments: PlannedRepayment[];
  /** 대시보드 차트·예상치에 보여줄 기간 (개월) */
  horizonMonths: number;
}

export interface Profile {
  title: string;
  owner: string;
  /**
   * 기록 시작 월. loans.ts 의 openingBalance 는 이 달 초 기준 잔액이고,
   * monthly-records.ts 의 첫 기록도 이 달이어야 합니다.
   */
  trackingStartMonth: YearMonth;
}

/* ------------------------------------------------------------------ */
/* 계산 결과 (src/lib 에서 만들어지는 값)                               */
/* ------------------------------------------------------------------ */

/** 입력값과 계산값을 합친 한 달의 전체 기록 */
export interface MonthlyRecord {
  month: YearMonth;
  /** true면 plan.ts 기반 예상치 */
  isForecast: boolean;
  income: number;
  openingDebt: number;
  principalPaid: number;
  interestPaid: number;
  newBorrowing: number;
  cardPayment: number;
  fixedExpenses: number;
  livingExpenses: number;
  closingDebt: number;
  /** closingDebt - openingDebt (음수면 감소) */
  debtChange: number;
  /** 월 대출 납입액 = 원금 + 이자 */
  loanPayment: number;
  /** 수입 + 신규 대출 - 모든 지출 */
  cashBalance: number;
  /** 월말 기준 대출별 잔액 */
  loanBalances: Record<string, number>;
  /** 대출별 해당 월 납입 내역 */
  loanPayments: Record<string, LoanPayment>;
  /** 예상 월에서 아직 알 수 없는 값 (실제 기록 월에는 없음) */
  missing?: ForecastMissing;
  review?: string;
  note?: string;
}

/** 예상 월에서 입력되지 않아 계산에 넣지 못한 값 */
export interface ForecastMissing {
  income: boolean;
  livingExpenses: boolean;
  /** 원금·이자를 알 수 없는 대출 ID (일정표 미입력) */
  loans: string[];
  /** 월말 총 부채를 확정할 수 없음 (이 달 또는 이전 달에 원금 미입력) */
  balance: boolean;
}

export interface DebtSummary {
  initialDebt: number;
  currentDebt: number;
  peakDebt: number;
  peakMonth: YearMonth;
  totalPrincipalPaid: number;
  totalInterestPaid: number;
  totalNewBorrowing: number;
  /** initialDebt - currentDebt = 누적 원금 상환 - 누적 신규 대출 */
  netReduction: number;
  /** netReduction / initialDebt (0~1) */
  reductionRate: number;
  /** 기록 시작 월 */
  firstMonth: YearMonth;
  /** 마지막 실제 기록 월 (월별 기록이 없으면 null) */
  lastMonth: YearMonth | null;
}

/**
 * 값의 출처
 * - record: monthly-records.ts 의 실제 기록
 * - manual: loans.ts 의 수동 스케줄
 * - auto: 상환 방식에 따른 자동 계산
 */
export type ScheduleSource = "record" | "manual" | "auto";

/** 대출 하나의 한 달 상환 내역 (실제 또는 예상) */
export interface LoanScheduleRow {
  month: YearMonth;
  /** 금융사 일정표의 회차 */
  installment?: number;
  kind: "actual" | "forecast";
  source: ScheduleSource;
  /** 원금 출처와 별개로, 이자가 추정치인지 여부 */
  interestEstimated: boolean;
  /** 일정표 미입력으로 원금을 알 수 없음 (principal 은 0 으로 둠) */
  principalMissing: boolean;
  /** 일정표 미입력 또는 금리 정보 없음으로 이자를 알 수 없음 (interest 는 0 으로 둠) */
  interestUnknown: boolean;
  /** 월말 원금을 확정할 수 있는지 (이 달까지 원금 미입력이 한 번도 없었는지) */
  balanceKnown: boolean;
  openingBalance: number;
  /** 이 달에 새로 빌린 금액 (대출 실행, 추가 인출) */
  borrowed: number;
  principal: number;
  interest: number;
  /** principal + interest */
  payment: number;
  closingBalance: number;
  /** 예상 구간 시작(이번 달)부터의 누적 — 실제 행은 기록 시작부터의 누적 */
  cumulativePrincipal: number;
  cumulativeInterest: number;
}

export type LoanState = "active" | "paid-off" | "upcoming";

/** 대출 하나의 실제 이력 + 완납까지의 예상 스케줄 */
export interface LoanProjection {
  loan: Loan;
  state: LoanState;
  /** 기록 시작 시점 잔액 (기록 중 실행된 대출은 실행 금액) */
  openingBalance: number;
  /** 마지막 실제 기록 기준 원금 잔액 */
  currentBalance: number;
  /** (최초 대출금 - 현재 잔액) / 최초 대출금 */
  progress: number;
  history: LoanScheduleRow[];
  schedule: LoanScheduleRow[];
  /** 이번 달 = 마지막 실제 기록의 다음 달 (기록이 없으면 기록 시작 월) */
  currentMonth: YearMonth;
  /** 이번 달 납입 — 완납했거나 이번 달에 납입이 없으면 없음 */
  thisMonth?: LoanScheduleRow;
  /** 이번 달 이후 첫 납입 (이번 달 납입이 있으면 thisMonth 와 같음) */
  nextDue?: LoanScheduleRow;
  nextMonth?: LoanScheduleRow;
  /** 예상 완납 월. 상환 계획이 없어 끝나지 않으면 null */
  payoffMonth: YearMonth | null;
  /** 예상 구간에서 알 수 있는 이자의 합계 (완납까지 확정되지 않았으면 일부만 포함) */
  remainingInterest: number;
  /**
   * remainingInterest 가 완납까지의 전체 이자가 아님.
   * (완납월을 알 수 없거나, 완납 전 구간에 미입력 달이 있음)
   */
  interestIncomplete: boolean;
  /** 금융사 상환 일정표 입력 여부 (항목이 하나라도 있으면 true) */
  hasSchedule: boolean;
  /** manual 이 아닌 대출에서 일정표가 끝나고 자동 계산이 시작되는 월 (없으면 null) */
  autoFromMonth: YearMonth | null;
  /** 예상 구간에서 원금 또는 이자가 미입력인 달 수 */
  missingMonths: number;
  /** 일정표와 계약 만기가 맞지 않을 때의 경고 (빌드는 막지 않음) */
  warnings: string[];
}

/** 모든 대출을 합친 한 달 */
export interface PortfolioMonth {
  month: YearMonth;
  kind: "actual" | "forecast";
  principal: number;
  interest: number;
  payment: number;
  borrowed: number;
  closingBalance: number;
  /** 월말 기준 대출별 잔액 */
  loanBalances: Record<string, number>;
  /** loanId → 그 달 납입 (납입이 있는 대출만) */
  byLoan: Record<string, { principal: number; interest: number; payment: number }>;
  /** 잔액이 남아 있지만 이 달 원금·이자를 알 수 없는 대출 ID (일정표 미입력) */
  missingLoans: string[];
  /** 월말 총 원금을 확정할 수 있는지 */
  balanceKnown: boolean;
}

export interface LoanPortfolio {
  projections: LoanProjection[];
  /** 실제 기록 월들 */
  history: PortfolioMonth[];
  /** 이번 달부터 모든 대출 완납(또는 계산 한도)까지 */
  schedule: PortfolioMonth[];
  /** 이번 달 = 마지막 실제 기록의 다음 달 */
  currentMonth: YearMonth;
  remainingPrincipal: number;
  remainingInterest: number;
  /** remainingPrincipal + remainingInterest */
  totalRepayment: number;
  /** 모든 대출 예상 완납 월 (끝나지 않는 대출이 있으면 null) */
  payoffMonth: YearMonth | null;
  /** 상환 계획이 없어 완납 시점을 계산할 수 없는 대출 */
  unresolved: Loan[];
  hasVariableRate: boolean;
  /** 완납까지의 이자를 알 수 없는 대출이 있어 remainingInterest 가 일부만 포함된 값 */
  interestIncomplete: boolean;
  /** 일정표에 미입력 달이 있거나 일정표가 없는 대출 */
  blankSchedules: Loan[];
}
