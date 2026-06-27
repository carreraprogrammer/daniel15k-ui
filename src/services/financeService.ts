import { api } from './api';
import type {
  AgentInsight,
  NightAnalysis,
  AgentUiEvent,
  Budget,
  BudgetLineItem,
  BudgetProposal,
  CategoryResource,
  BudgetQueryParams,
  CompletenessResponse,
  CurrentPlan,
  Debt,
  DebtPayload,
  DebtQueryParams,
  FinancialContextSummary,
  IncomeSource,
  IncomeSourcePayload,
  IncomeSourceQueryParams,
  PlannedExpense,
  PlannedExpensePayload,
  PlannedExpenseQueryParams,
  MonthlyPlanHistory,
  JsonApiCollection,
  RecurringObligation,
  RecurringObligationPayload,
  RecurringObligationQueryParams,
  SavingsGoal,
  SavingsGoalPayload,
  SinkingFund,
  SinkingFundPayload,
  SubcategoryCreateParams,
  SubcategoryCreated,
  SummaryResponse,
  UserMilestone,
  Transaction,
  TransactionCreatePayload,
  TransactionLinkPayload,
  TransactionQueryParams,
  TransactionUpdatePayload,
  WizardData,
  NightAnalysisTransactionContext,
} from '../types/finance.types';

const now = new Date();
const defaultMonth = now.getMonth() + 1;
const defaultYear = now.getFullYear();

type ResourceWithAttributes<T> = {
  id: string;
  type?: string;
  attributes: T;
  relationships?: Record<string, unknown>;
};

const normalizeResource = <T extends Record<string, unknown>>(item: unknown): ResourceWithAttributes<T> => {
  if (!item || typeof item !== 'object') {
    return { id: '', attributes: {} as T };
  }

  const candidate = item as { id?: string | number; type?: string; attributes?: T; relationships?: Record<string, unknown> };
  if (candidate.attributes) {
    return {
      id: String(candidate.id ?? ''),
      type: candidate.type,
      attributes: candidate.attributes,
      relationships: candidate.relationships,
    };
  }

  const plain = item as T & { id?: string | number };
  const { id, ...attributes } = plain;

  return {
    id: String(id ?? ''),
    attributes: attributes as T,
  };
};

const normalizeCollection = <T extends Record<string, unknown>>(
  payload: unknown,
): JsonApiCollection<ResourceWithAttributes<T>> => {
  const envelope = (payload ?? {}) as { data?: unknown[]; meta?: JsonApiCollection<ResourceWithAttributes<T>>['meta'] };

  return {
    data: Array.isArray(envelope.data) ? envelope.data.map((item) => normalizeResource<T>(item)) : [],
    meta: envelope.meta,
  };
};

const normalizeSingle = <T extends Record<string, unknown>>(payload: unknown): ResourceWithAttributes<T> => {
  const envelope = (payload ?? {}) as { data?: unknown };
  return normalizeResource<T>(envelope.data);
};

export const financeService = {
  async fetchSummary(month = defaultMonth, year = defaultYear): Promise<SummaryResponse> {
    const { data } = await api.get('/api/v1/summary', { params: { month, year } });
    return data as SummaryResponse;
  },

  async fetchLatestInsight(): Promise<AgentInsight | null> {
    const { data } = await api.get('/api/v1/agent_insights/latest');
    return (data as { data: AgentInsight | null }).data ?? null;
  },

  async updateInsightStatus(id: number, status: 'seen' | 'actioned' | 'dismissed'): Promise<AgentInsight> {
    const { data } = await api.patch(`/api/v1/agent_insights/${id}`, { status });
    return (data as { data: AgentInsight }).data;
  },

  async fetchNightAnalysisByDate(date: string): Promise<NightAnalysis | null> {
    const { data } = await api.get(`/api/v1/night_analyses/${date}`);
    return (data as { data: NightAnalysis | null }).data ?? null;
  },

  async fetchNeedsReview(): Promise<NonNullable<NightAnalysisTransactionContext['needs_review']>> {
    const { data } = await api.get('/api/v1/transactions/needs_review');
    return (data as { data: NightAnalysisTransactionContext['needs_review'] }).data ?? [];
  },

  async fetchTransactions(params: TransactionQueryParams = {}): Promise<JsonApiCollection<Transaction>> {
    const { data } = await api.get('/api/v1/transactions', {
      params: {
        month: params.month ?? defaultMonth,
        year: params.year ?? defaultYear,
        page: params.page,
        per_page: params.per_page,
        q: params.q,
        status: params.status,
        transaction_type: params.transaction_type,
        source: params.source,
        category_id: params.category_id,
        subcategory_id: params.subcategory_id,
        sort_by: params.sort_by,
        sort_dir: params.sort_dir,
      },
    });
    return normalizeCollection<Transaction['attributes']>(data) as JsonApiCollection<Transaction>;
  },

  async fetchPendingTransactions(params: TransactionQueryParams = {}): Promise<JsonApiCollection<Transaction>> {
    const { data } = await api.get('/api/v1/transactions/pending', {
      params: {
        q: params.q,
        source: params.source,
        category_id: params.category_id,
        sort_by: params.sort_by,
        sort_dir: params.sort_dir,
      },
    });
    return normalizeCollection<Transaction['attributes']>(data) as JsonApiCollection<Transaction>;
  },

  async fetchDebts(params: DebtQueryParams = {}): Promise<JsonApiCollection<Debt>> {
    const { data } = await api.get('/api/v1/debts', {
      params: {
        q: params.q,
        status: params.status,
        debt_type: params.debt_type,
        sort_by: params.sort_by,
        sort_dir: params.sort_dir,
      },
    });
    return normalizeCollection<Debt['attributes']>(data) as JsonApiCollection<Debt>;
  },

  async fetchBudgets(params: BudgetQueryParams = {}): Promise<JsonApiCollection<Budget>> {
    const { data } = await api.get('/api/v1/budgets', {
      params: {
        month: params.month ?? defaultMonth,
        year: params.year ?? defaultYear,
        q: params.q,
        category_id: params.category_id,
        sort_by: params.sort_by,
        sort_dir: params.sort_dir,
      },
    });
    return normalizeCollection<Budget['attributes']>(data) as JsonApiCollection<Budget>;
  },

  async fetchIncomeSources(params: IncomeSourceQueryParams = {}): Promise<JsonApiCollection<IncomeSource>> {
    const { data } = await api.get('/api/v1/income_sources', {
      params: {
        q: params.q,
        active: params.active,
        is_variable: params.is_variable,
        sort_by: params.sort_by,
        sort_dir: params.sort_dir,
      },
    });
    return normalizeCollection<IncomeSource['attributes']>(data) as JsonApiCollection<IncomeSource>;
  },

  async createIncomeSource(payload: IncomeSourcePayload): Promise<IncomeSource> {
    const { data } = await api.post('/api/v1/income_sources', payload);
    return normalizeSingle<IncomeSource['attributes']>(data) as IncomeSource;
  },

  async updateIncomeSource(id: string, payload: Partial<IncomeSourcePayload>): Promise<IncomeSource> {
    const { data } = await api.patch(`/api/v1/income_sources/${id}`, payload);
    return normalizeSingle<IncomeSource['attributes']>(data) as IncomeSource;
  },

  async deleteIncomeSource(id: string): Promise<void> {
    await api.delete(`/api/v1/income_sources/${id}`);
  },

  async fetchFinancialContext(): Promise<FinancialContextSummary | null> {
    const { data } = await api.get('/api/v1/financial_context');
    return (data?.data ?? null) as FinancialContextSummary | null;
  },

  async updateFinancialContext(
    payload: Partial<FinancialContextSummary> & { reward_pct?: number; debts_confirmed_at?: string | null },
  ): Promise<FinancialContextSummary> {
    const { data } = await api.patch('/api/v1/financial_context', payload);
    return data?.data as FinancialContextSummary;
  },

  async fetchRecurringObligations(
    params: RecurringObligationQueryParams = {},
  ): Promise<JsonApiCollection<RecurringObligation>> {
    const { data } = await api.get('/api/v1/recurring_obligations', {
      params: {
        q: params.q,
        active: params.active,
        category_id: params.category_id,
        sort_by: params.sort_by,
        sort_dir: params.sort_dir,
      },
    });
    return normalizeCollection<RecurringObligation['attributes']>(data) as JsonApiCollection<RecurringObligation>;
  },

  async fetchPlannedExpenses(
    params: PlannedExpenseQueryParams = {},
  ): Promise<JsonApiCollection<PlannedExpense>> {
    const { data } = await api.get('/api/v1/planned_expenses', {
      params: {
        q: params.q,
        status: params.status,
        planning_type: params.planning_type,
        category_id: params.category_id,
        sort_by: params.sort_by,
        sort_dir: params.sort_dir,
      },
    });
    return normalizeCollection<PlannedExpense['attributes']>(data) as JsonApiCollection<PlannedExpense>;
  },

  async getSinkingFunds(): Promise<SinkingFund[]> {
    const { data } = await api.get('/api/v1/sinking_funds');
    return ((data as { data?: SinkingFund[] }).data ?? []) as SinkingFund[];
  },

  async createSinkingFund(payload: SinkingFundPayload): Promise<SinkingFund> {
    const { data } = await api.post('/api/v1/sinking_funds', payload);
    return (data.data ?? data) as SinkingFund;
  },

  async updateSinkingFund(id: number, payload: Partial<SinkingFundPayload>): Promise<SinkingFund> {
    const { data } = await api.patch(`/api/v1/sinking_funds/${id}`, payload);
    return (data.data ?? data) as SinkingFund;
  },

  async deleteSinkingFund(id: number): Promise<void> {
    await api.delete(`/api/v1/sinking_funds/${id}`);
  },

  async withdrawSinkingFund(id: number, amount?: number): Promise<SinkingFund> {
    const { data } = await api.post(
      `/api/v1/sinking_funds/${id}/withdraw`,
      amount != null ? { amount } : {},
    );
    const body = (data.data ?? data) as { sinking_fund?: SinkingFund };
    return (body.sinking_fund ?? body) as SinkingFund;
  },

  async fetchCompleteness(month = defaultMonth, year = defaultYear): Promise<CompletenessResponse> {
    const { data } = await api.get('/api/v1/completeness', { params: { month, year } });
    return (data as { data: CompletenessResponse }).data;
  },

  async getMonthlyPlans(page?: number): Promise<{ data: MonthlyPlanHistory[]; meta?: JsonApiCollection<MonthlyPlanHistory>['meta'] }> {
    const { data } = await api.get('/api/v1/monthly_plans', { params: page ? { page } : undefined });
    return data as { data: MonthlyPlanHistory[]; meta?: JsonApiCollection<MonthlyPlanHistory>['meta'] };
  },

  async closeMonthlyPlan(id: number): Promise<MonthlyPlanHistory> {
    const { data } = await api.post(`/api/v1/monthly_plans/${id}/close`);
    return (data.data ?? data) as MonthlyPlanHistory;
  },

  async getSavingsGoals(): Promise<SavingsGoal[]> {
    const { data } = await api.get('/api/v1/savings_goals');
    return ((data as { data?: SavingsGoal[] }).data ?? []) as SavingsGoal[];
  },

  async createSavingsGoal(payload: SavingsGoalPayload): Promise<SavingsGoal> {
    const { data } = await api.post('/api/v1/savings_goals', payload);
    return (data.data ?? data) as SavingsGoal;
  },

  async updateSavingsGoal(id: number, payload: Partial<SavingsGoalPayload>): Promise<SavingsGoal> {
    const { data } = await api.patch(`/api/v1/savings_goals/${id}`, payload);
    return (data.data ?? data) as SavingsGoal;
  },

  async deleteSavingsGoal(id: number): Promise<void> {
    await api.delete(`/api/v1/savings_goals/${id}`);
  },

  async fetchCategories(): Promise<JsonApiCollection<CategoryResource>> {
    const { data } = await api.get('/api/v1/categories');
    return normalizeCollection<CategoryResource['attributes']>(data) as JsonApiCollection<CategoryResource>;
  },

  async fetchTransactionById(id: string): Promise<Transaction> {
    const { data } = await api.get(`/api/v1/transactions/${id}`);
    return normalizeSingle<Transaction['attributes']>(data) as Transaction;
  },

  async createTransaction(payload: TransactionCreatePayload): Promise<Transaction> {
    const { data } = await api.post('/api/v1/transactions', payload);
    return normalizeSingle<Transaction['attributes']>(data) as Transaction;
  },

  async updateTransaction(id: string, payload: TransactionUpdatePayload): Promise<Transaction> {
    const { data } = await api.patch(`/api/v1/transactions/${id}`, payload);
    return normalizeSingle<Transaction['attributes']>(data) as Transaction;
  },

  async linkTransaction(id: string, payload: TransactionLinkPayload): Promise<void> {
    await api.patch(`/api/v1/transactions/${id}`, payload);
  },

  async confirmTransaction(id: string, subcategoryCode?: string): Promise<void> {
    await api.patch(`/api/v1/transactions/${id}`, {
      status: 'confirmed',
      ...(subcategoryCode ? { subcategory_code: subcategoryCode } : {}),
    });
  },

  async dismissTransactionFlag(id: string): Promise<void> {
    await api.patch(`/api/v1/transactions/${id}`, {
      clarification_resolved_at: new Date().toISOString(),
    });
  },

  async deleteTransaction(id: string): Promise<void> {
    await api.delete(`/api/v1/transactions/${id}`);
  },

  async createDebt(payload: DebtPayload): Promise<Debt> {
    const { data } = await api.post('/api/v1/debts', payload);
    return normalizeSingle<Debt['attributes']>(data) as Debt;
  },

  async updateDebt(id: string, payload: Partial<DebtPayload>): Promise<Debt> {
    const { data } = await api.patch(`/api/v1/debts/${id}`, payload);
    return normalizeSingle<Debt['attributes']>(data) as Debt;
  },

  async deleteDebt(id: string): Promise<void> {
    await api.delete(`/api/v1/debts/${id}`);
  },

  async createRecurringObligation(payload: RecurringObligationPayload): Promise<RecurringObligation> {
    const { data } = await api.post('/api/v1/recurring_obligations', payload);
    return normalizeSingle<RecurringObligation['attributes']>(data) as RecurringObligation;
  },

  async updateRecurringObligation(
    id: string,
    payload: Partial<RecurringObligationPayload>,
  ): Promise<RecurringObligation> {
    const { data } = await api.patch(`/api/v1/recurring_obligations/${id}`, payload);
    return normalizeSingle<RecurringObligation['attributes']>(data) as RecurringObligation;
  },

  async deleteRecurringObligation(id: string): Promise<void> {
    await api.delete(`/api/v1/recurring_obligations/${id}`);
  },

  async createPlannedExpense(payload: PlannedExpensePayload): Promise<PlannedExpense> {
    const { data } = await api.post('/api/v1/planned_expenses', payload);
    return normalizeSingle<PlannedExpense['attributes']>(data) as PlannedExpense;
  },

  async updatePlannedExpense(
    id: string,
    payload: Partial<PlannedExpensePayload>,
  ): Promise<PlannedExpense> {
    const { data } = await api.patch(`/api/v1/planned_expenses/${id}`, payload);
    return normalizeSingle<PlannedExpense['attributes']>(data) as PlannedExpense;
  },

  async getPendingAgentEvents(sessionId?: string): Promise<AgentUiEvent[]> {
    const params = sessionId ? { session_id: sessionId } : {};
    const { data } = await api.get('/api/v1/agent_events/pending', { params });
    return (data.data as AgentUiEvent[]) ?? [];
  },

  async consumeAgentEvent(id: number): Promise<void> {
    await api.patch(`/api/v1/agent_events/${id}/consume`);
  },

  async proposeBudgetPlan(params: {
    includeVariable: boolean;
    month?: number;
    year?: number;
  }): Promise<BudgetProposal> {
    const { data } = await api.get('/api/v1/monthly_plans/propose', {
      params: {
        include_variable: params.includeVariable,
        month: params.month,
        year: params.year,
      },
    });
    return data.data as BudgetProposal;
  },

  async generateMonthlyPlan(mode: string): Promise<{ id: number }> {
    const { data } = await api.post('/api/v1/monthly_plans/generate', { mode });
    return data.data as { id: number };
  },

  async confirmMonthlyPlan(
    id: number,
    updates: Record<string, unknown>,
    budgets: { category_id: number; amount_limit: number }[],
  ): Promise<void> {
    await api.post(`/api/v1/monthly_plans/${id}/confirm`, { ...updates, budgets });
  },

  // ── Budget Wizard endpoints ────────────────────────────────────────────────

  /** GET /api/v1/monthly_plans/wizard_data */
  async fetchWizardData(month?: string): Promise<WizardData> {
    const params: Record<string, string | number> = {};
    if (month) {
      const [year, mon] = month.split('-');
      params.year = Number(year);
      params.month = Number(mon);
    }
    const { data } = await api.get('/api/v1/monthly_plans/wizard_data', { params });
    return (data.data ?? data) as WizardData;
  },

  /**
   * POST /api/v1/monthly_plans/generate
   * Wizard variant — always accepts `{ mode }` and returns `{ id, status }`.
   */
  async generateMonthlyPlanForWizard(params: { mode?: string }): Promise<{ id: string; status: string }> {
    const { data } = await api.post('/api/v1/monthly_plans/generate', {
      mode: params.mode ?? 'conservative',
    });
    return (data.data ?? data) as { id: string; status: string };
  },

  /**
   * POST /api/v1/monthly_plans/:id/confirm
   * Wizard variant — sends budget lines shaped as BudgetLineItem[].
   */
  async confirmMonthlyPlanWithLines(planId: string, lines: BudgetLineItem[], goalContributionAmount?: number): Promise<void> {
    await api.post(`/api/v1/monthly_plans/${planId}/confirm`, {
      lines,
      ...(goalContributionAmount ? { goal_contribution_amount: goalContributionAmount } : {}),
    });
  },

  /** GET /api/v1/monthly_plans/current — returns null when no plan is active */
  async fetchCurrentPlan(params?: { month?: number; year?: number }): Promise<CurrentPlan | null> {
    try {
      const { data } = await api.get('/api/v1/monthly_plans/current', { params });
      if (!data || (!data.data && !data.id)) return null;
      return (data.data ?? data) as CurrentPlan;
    } catch (err: unknown) {
      // 404 means no plan for this month — that's a valid empty state
      const status = (err as { response?: { status?: number } }).response?.status;
      if (status === 404) return null;
      throw err;
    }
  },

  // ── Subcategory endpoints ──────────────────────────────────────────────────

  /** POST /api/v1/subcategories */
  async createSubcategory(params: SubcategoryCreateParams): Promise<SubcategoryCreated> {
    const { data } = await api.post('/api/v1/subcategories', params);
    const resource = normalizeSingle<{
      name?: string;
      code?: string;
      icon?: string;
      category_id?: string | number;
    }>(data);

    return {
      id: resource.id,
      code: String(resource.attributes.code ?? ''),
      name: String(resource.attributes.name ?? ''),
      icon: String(resource.attributes.icon ?? ''),
      category_id: String(resource.attributes.category_id ?? ''),
    };
  },

  async fetchMilestones(): Promise<UserMilestone[]> {
    const { data } = await api.get('/api/v1/milestones');
    return ((data as { data?: UserMilestone[] }).data ?? (Array.isArray(data) ? data : [])) as UserMilestone[];
  },

  async fetchChatHistory(limit = 30): Promise<{ role: 'user' | 'assistant'; content: string; created_at: string }[]> {
    const { data } = await api.get(`/api/v1/chat_messages?channel=app&limit=${limit}`);
    return ((data as { data?: { role: 'user' | 'assistant'; content: string; created_at: string }[] }).data ?? []);
  },

  async startWebChat(message: string, source = 'web'): Promise<{ session_id: string }> {
    const { data } = await api.post('/api/v1/agents/chat', { message, source });
    return data.data as { session_id: string };
  },

  async replyWebChat(
    sessionId: string,
    eventId: number,
    type: 'form_submitted' | 'confirmed' | 'dismissed' | 'categories_selected' | 'amounts_confirmed' | 'callback',
    eventData?: Record<string, unknown>,
  ): Promise<void> {
    await api.post('/api/v1/agents/chat', {
      session_id: sessionId,
      source: 'web',
      event_response: { event_id: eventId, type, data: eventData ?? {} },
    });
  },
};
