import { api } from './api';
import type {
  Budget,
  CategoryResource,
  BudgetQueryParams,
  CompletenessResponse,
  Debt,
  DebtPayload,
  DebtQueryParams,
  IncomeSource,
  IncomeSourcePayload,
  IncomeSourceQueryParams,
  JsonApiCollection,
  RecurringObligation,
  RecurringObligationPayload,
  RecurringObligationQueryParams,
  SummaryResponse,
  Transaction,
  TransactionCreatePayload,
  TransactionQueryParams,
  TransactionUpdatePayload,
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

  async fetchCompleteness(month = defaultMonth, year = defaultYear): Promise<CompletenessResponse> {
    const { data } = await api.get('/api/v1/completeness', { params: { month, year } });
    return (data as { data: CompletenessResponse }).data;
  },

  async fetchCategories(): Promise<JsonApiCollection<CategoryResource>> {
    const { data } = await api.get('/api/v1/categories');
    return normalizeCollection<CategoryResource['attributes']>(data) as JsonApiCollection<CategoryResource>;
  },

  async createTransaction(payload: TransactionCreatePayload): Promise<Transaction> {
    const { data } = await api.post('/api/v1/transactions', payload);
    return normalizeSingle<Transaction['attributes']>(data) as Transaction;
  },

  async updateTransaction(id: string, payload: TransactionUpdatePayload): Promise<Transaction> {
    const { data } = await api.patch(`/api/v1/transactions/${id}`, payload);
    return normalizeSingle<Transaction['attributes']>(data) as Transaction;
  },

  async deleteTransaction(id: string): Promise<void> {
    console.debug('[financeService] deleteTransaction:request', { id });
    await api.delete(`/api/v1/transactions/${id}`);
    console.debug('[financeService] deleteTransaction:success', { id });
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
};
