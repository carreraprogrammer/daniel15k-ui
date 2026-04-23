export interface SummaryBalance {
  income_confirmed: number;
  income_pending: number;
  expense_confirmed: number;
  expense_pending: number;
  balance_confirmed: number;
  balance_total: number;
}

export type TransactionType = 'expense' | 'income';
export type TransactionStatus = 'confirmed' | 'pending';

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

export interface SummaryMonthlyPlan {
  id: number;
  status: string;
  mode: string;
  base_budget_income: number;
  expected_variable_income: number;
  recurring_obligations_total: number;
  debt_minimums_total: number;
  protected_buffer_amount: number;
  discretionary_limit: number;
  overflow_rule: string;
  overflow_rule_detail?: Record<string, unknown>;
  reward_pct: number;
  debt_strategy?: string | null;
  assumptions?: Record<string, unknown>;
  confirmed_at?: string | null;
}

export interface SummaryOverflowStatus {
  rule: string;
  rule_detail?: Record<string, unknown>;
  base_budget_income: number;
  confirmed_income: number;
  expected_variable_income: number;
  realized_overflow: number;
  remaining_expected_overflow: number;
  status: 'waiting' | 'available';
  suggested_destination?: {
    type: string;
    label?: string;
    debt_id?: number;
    debt_name?: string;
    strategy?: string;
  } | null;
  suggested_action?: string | null;
}

export interface SummaryResponse {
  period: {
    month: number;
    year: number;
  };
  balance: SummaryBalance;
  burn_rate: SummaryBurnRate | null;
  debts: DebtSummary | null;
  monthly_plan?: SummaryMonthlyPlan | null;
  overflow_status?: SummaryOverflowStatus | null;
  financial_context: FinancialContextSummary | null;
}

export type CompletenessStatus = 'missing' | 'partial' | 'sufficient' | 'stale' | 'conflicting';

export interface CompletenessDimension {
  status: CompletenessStatus;
  reason?: string;
  message?: string;
  observed?: Record<string, unknown>;
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
    color?: string;
    icon?: string;
  };
  relationships?: {
    subcategories?: {
      data?: Array<{
        id: string;
        type?: string;
        attributes?: {
          name?: string;
          code?: string;
          icon?: string;
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
    classification?: 'base' | 'variable' | 'seasonal' | 'one_time';
    cadence?: 'monthly' | 'biweekly' | 'weekly' | 'irregular';
    reliability_score?: number;
    last_confirmed_at?: string | null;
    evidence_source?: string | null;
    notes?: string | null;
    schedules?: IncomeSourceSchedule[];
    active?: boolean;
  };
}

export interface IncomeSourceSchedule {
  id?: string;
  ordinal: number;
  label?: string | null;
  expected_day_from: number;
  expected_day_to: number;
  expected_amount: number;
}

export interface IncomeSourcePayload {
  name: string;
  expected_day_from: number | '';
  expected_day_to: number | '';
  expected_amount: number | '';
  classification: 'base' | 'variable' | 'seasonal' | 'one_time';
  cadence?: 'monthly' | 'biweekly' | 'weekly' | 'irregular';
  reliability_score?: number;
  last_confirmed_at?: string | null;
  evidence_source?: string;
  notes?: string;
  schedules?: IncomeSourceSchedule[];
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
    category_code?: string | null;
    category_color?: string | null;
    subcategory_id?: number | null;
    subcategory_name?: string | null;
    subcategory_icon?: string | null;
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
  subcategory_id?: number | string;
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

// Budget proposal

export interface BudgetProposalCategory {
  code: string;
  name: string;
  category_type: string;
  suggested_amount: number;
  avg_spent: number | null;
  months_with_data: number;
  range_hint: string | null;
}

export interface BudgetAvailableCategory {
  code: string;
  name: string;
  category_type: string;
  range_hint: string | null;
}

export interface BudgetProposal {
  income: {
    fixed_total: number;
    variable_projection: number;
    planning_income: number;
    include_variable: boolean;
    fixed_sources: { name: string; amount: number }[];
    variable_sources: { name: string; expected_amount: number; reliability_score: number; conservative_projection: number }[];
  };
  committed: {
    obligations_total: number;
    debt_minimums_total: number;
    sinking_funds_total: number;
    total: number;
    by_category?: Record<string, { total: number; items: { name: string }[] }>;
  };
  sinking_funds: { id: number; name: string; monthly_contribution: number }[];
  categories: BudgetProposalCategory[];
  available_categories: BudgetAvailableCategory[];
  free_margin: number;
  has_history: boolean;
  mode: 'data_driven' | 'provisional';
  warnings: string[];
  existing_plan: Record<string, unknown> | null;
  month: number;
  year: number;
}

// ── Current monthly plan (active plan view) ──────────────────────────────────

export interface CurrentPlanLine {
  /** Subcategory code, e.g. "committed_rent" */
  subcategory_code: string;
  subcategory_name: string;
  /** Behavioral category code, e.g. "committed" */
  category_code: string;
  category_name: string;
  budgeted: number;
  spent: number;
  projected: number;
}

export interface CurrentPlan {
  id: string;
  month: string;   // "YYYY-MM"
  status: string;  // "confirmed" | "draft" | etc.
  total_income: number;
  lines: CurrentPlanLine[];
}

// ── Budget Wizard types ──────────────────────────────────────────────────────

export interface WizardSubcategory {
  code: string;
  name: string;
  icon: string;
  suggested_amount: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface WizardCategory {
  id: string;
  code: string;
  name: string;
  color: string;
  icon: string;
  description: string;
  subcategories: WizardSubcategory[];
  suggested_total: number;
}

export interface SubcategoryCreateParams {
  name: string;
  category_id: string;
  icon: string;
}

export interface SubcategoryCreated {
  code: string;
  name: string;
  icon: string;
  category_id: string;
}

export interface WizardIncomeSource {
  name: string;
  monthly_amount: number;
  is_variable: boolean;
}

export interface WizardData {
  income: {
    sources: WizardIncomeSource[];
    suggested_total: number;
  };
  categories: WizardCategory[];
}

export interface BudgetLineItem {
  subcategory_code: string;
  amount: number;
}

export interface BudgetPlanDraft {
  month: string;
  total_income: number;
  lines: BudgetLineItem[];
}

// Agent UI Events — canal agente → front-end

export type AgentUiEventType =
  | 'show_plan_proposal'
  | 'show_card'
  | 'show_form'
  | 'request_confirmation'
  | 'show_category_selector'
  | 'show_amount_editor'
  | 'navigate';

export interface MonthlyPlanDraft {
  month: number;
  year: number;
  base_budget_income: number;
  recurring_obligations_total: number;
  debt_minimums_total: number;
  protected_buffer_amount: number;
  free_margin: number;
  discretionary_limit: number;
  overflow_rule?: string;
  distribution?: Record<string, number>;
  warnings?: string[];
}

export interface ShowCardPayload {
  title: string;
  body: string;
  tone: 'info' | 'warning' | 'success';
}

export interface DynamicField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'date';
  options?: { label: string; value: string }[];
  required?: boolean;
}

export interface ShowFormPayload {
  fields: DynamicField[];
  prefilled: Record<string, unknown>;
}

export interface RequestConfirmationPayload {
  question: string;
  context?: string;
}

export interface BudgetCategoryOption {
  code: string;
  name: string;
  category_type: string;
  selected: boolean;
}

export interface ShowCategorySelectorPayload {
  categories: BudgetCategoryOption[];
  title: string;
  subtitle?: string;
}

export interface AmountEditorItem {
  code: string;
  name: string;
  amount: number;
  editable: boolean;
}

export interface ShowAmountEditorPayload {
  items: AmountEditorItem[];
  title: string;
  subtitle?: string;
}

export type AgentUiEventPayload =
  | ({ draft: MonthlyPlanDraft } & { warnings?: string[] })
  | ShowCardPayload
  | ShowFormPayload
  | RequestConfirmationPayload
  | ShowCategorySelectorPayload
  | ShowAmountEditorPayload;

export interface AgentUiEvent {
  id: number;
  event_type: AgentUiEventType;
  payload: AgentUiEventPayload;
  session_id?: string;
  created_at: string;
}
