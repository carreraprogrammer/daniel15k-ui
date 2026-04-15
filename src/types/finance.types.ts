export interface SummaryBalance {
  income_confirmed: number;
  income_projected: number;
  expense_confirmed: number;
  expense_pending: number;
  expense_projected: number;
  balance_confirmed: number;
  balance_total: number;
}

export interface BurnRateCategory {
  category: string;
  category_id: number;
  budget: number;
  spent: number;
  projected: number;
  pct: number;
  on_track: boolean;
  alert: string | null;
}

export interface SummaryBurnRate {
  days_elapsed: number;
  days_in_month: number;
  categories: BurnRateCategory[];
}

export interface DebtSummary {
  total_balance: number;
  monthly_payments: number;
  recommended_payment: {
    id: number;
    name: string;
    balance: number;
    strategy: string;
  } | null;
}

export interface FinancialContextSummary {
  phase: string;
  strategy: string;
  monthly_surplus_estimate: number;
  recommended_action: string | null;
}

export interface SummaryResponse {
  period: {
    month: number;
    year: number;
  };
  balance: SummaryBalance;
  burn_rate: SummaryBurnRate | null;
  debts: DebtSummary | null;
  financial_context: FinancialContextSummary | null;
}

export interface Transaction {
  id: string;
  type?: string;
  attributes: {
    date: string;
    concept: string;
    product: string;
    amount: number;
    transaction_type?: string;
    status?: string;
    source?: string;
    category_id?: number | null;
    subcategory_id?: number | null;
    month?: number;
    year?: number;
  };
}

export interface Debt {
  id: string;
  type?: string;
  attributes: {
    name: string;
    debt_type: string;
    original_amount: number;
    current_balance: number;
    monthly_payment: number;
    interest_rate: number;
    status: string;
    payoff_date?: string | null;
  };
}

export interface Budget {
  id: string;
  type?: string;
  attributes: {
    category_id: number;
    category_name?: string;
    month: number;
    year: number;
    amount_limit: number;
  };
}

export interface IncomeSource {
  id: string;
  type?: string;
  attributes: {
    name: string;
    expected_day_from: number;
    expected_day_to: number;
    expected_amount: number;
    is_variable: boolean;
    active?: boolean;
  };
}

export interface RecurringObligation {
  id: string;
  type?: string;
  attributes: {
    name: string;
    amount: number;
    due_day: number;
    active?: boolean;
    category_id?: number | null;
    category_name?: string | null;
  };
}

export interface JsonApiCollection<T> {
  data: T[];
  meta?: {
    total?: number;
  };
}
