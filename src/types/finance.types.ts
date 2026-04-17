export interface SummaryBalance {
  income_confirmed: number;
  income_projected: number;
  expense_confirmed: number;
  expense_pending: number;
  expense_projected: number;
  balance_confirmed: number;
  balance_total: number;
}

export type TransactionType = 'expense' | 'income';
export type TransactionStatus = 'confirmed' | 'pending' | 'projected';

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

export type CompletenessStatus = 'missing' | 'partial' | 'sufficient' | 'stale' | 'conflicting';

export interface CompletenessDimension {
  status: CompletenessStatus;
  message: string;
}

export interface CompletenessResponse {
  period: { month: number; year: number };
  dimensions: Record<string, CompletenessDimension>;
  missing: string[];
  partial: string[];
  stale: string[];
  conflicting: string[];
}

export interface Transaction {
  id: string;
  type?: string;
  attributes: {
    date: string;
    concept: string;
    product: string;
    amount: number;
    transaction_type?: TransactionType;
    status?: TransactionStatus;
    source?: string;
    category_id?: number | null;
    subcategory_id?: number | null;
    source_event_id?: string | null;
    month?: number;
    year?: number;
  };
  relationships?: {
    category?: {
      data?: {
        id: string;
        type?: string;
      } | null;
    };
    subcategory?: {
      data?: {
        id: string;
        type?: string;
      } | null;
    };
  };
}

export interface CategoryResource {
  id: string;
  type?: string;
  attributes: {
    name?: string;
    code?: string;
    category_type?: string;
  };
  relationships?: {
    subcategories?: {
      data?: Array<{
        id: string;
        type?: string;
        attributes?: {
          name?: string;
          code?: string;
        };
      }>;
    };
  };
}

export interface ResolvedTransactionCategory {
  categoryId: string;
  categoryName: string;
  categoryCode: string;
  categoryType: string;
  subcategoryId?: string;
  subcategoryName?: string;
  subcategoryCode?: string;
}

export interface TransactionCreatePayload {
  date: string;
  concept: string;
  product: string;
  amount: number;
  transaction_type: TransactionType;
  status: TransactionStatus;
  source?: 'manual';
}

export interface TransactionUpdatePayload {
  date: string;
  concept: string;
  product: string;
  amount: number;
  status: TransactionStatus;
  source?: 'manual';
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
    notes?: string | null;
  };
}

export interface DebtPayload {
  name: string;
  debt_type: string;
  current_balance: number;
  monthly_payment: number;
  interest_rate: number;
  status: string;
  original_amount?: number;
  payoff_date?: string | null;
  notes?: string;
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
    classification?: 'base' | 'variable';
    reliability_score?: number;
    active?: boolean;
  };
}

export interface IncomeSourcePayload {
  name: string;
  expected_day_from: number | '';
  expected_day_to: number | '';
  expected_amount: number | '';
  classification: 'base' | 'variable';
  reliability_score?: number;
  is_variable?: boolean;
  active?: boolean;
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
    notes?: string | null;
  };
}

export interface RecurringObligationPayload {
  name: string;
  amount: number;
  due_day: number | '';
  active?: boolean;
  category_id?: number | null;
  notes?: string;
}

export interface JsonApiCollection<T> {
  data: T[];
  meta?: {
    total?: number;
    page?: number;
    per_page?: number;
    total_pages?: number;
    has_next_page?: boolean;
  };
}

export interface TransactionQueryParams {
  month?: number;
  year?: number;
  page?: number;
  per_page?: number;
  q?: string;
  status?: string;
  transaction_type?: string;
  source?: string;
  category_id?: number | string;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
}

export interface DebtQueryParams {
  q?: string;
  status?: string;
  debt_type?: string;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
}

export interface RecurringObligationQueryParams {
  q?: string;
  active?: boolean | 'all';
  category_id?: number | string;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
}

export interface IncomeSourceQueryParams {
  q?: string;
  active?: boolean | 'all';
  is_variable?: boolean | 'all';
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
}

export interface BudgetQueryParams {
  month?: number;
  year?: number;
  q?: string;
  category_id?: number | string;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
}
