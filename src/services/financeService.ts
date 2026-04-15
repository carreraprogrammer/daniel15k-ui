import { api } from './api';
import type {
  Budget,
  Debt,
  IncomeSource,
  JsonApiCollection,
  RecurringObligation,
  SummaryResponse,
  Transaction,
  TransactionCreatePayload,
  TransactionUpdatePayload,
} from '../types/finance.types';

const now = new Date();
const defaultMonth = now.getMonth() + 1;
const defaultYear = now.getFullYear();

type ResourceWithAttributes<T> = {
  id: string;
  type?: string;
  attributes: T;
};

const normalizeResource = <T extends Record<string, unknown>>(item: unknown): ResourceWithAttributes<T> => {
  if (!item || typeof item !== 'object') {
    return { id: '', attributes: {} as T };
  }

  const candidate = item as { id?: string | number; type?: string; attributes?: T };
  if (candidate.attributes) {
    return {
      id: String(candidate.id ?? ''),
      type: candidate.type,
      attributes: candidate.attributes,
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

  async fetchTransactions(month = defaultMonth, year = defaultYear): Promise<JsonApiCollection<Transaction>> {
    const { data } = await api.get('/api/v1/transactions', { params: { month, year } });
    return normalizeCollection<Transaction['attributes']>(data) as JsonApiCollection<Transaction>;
  },

  async fetchPendingTransactions(): Promise<JsonApiCollection<Transaction>> {
    const { data } = await api.get('/api/v1/transactions/pending');
    return normalizeCollection<Transaction['attributes']>(data) as JsonApiCollection<Transaction>;
  },

  async fetchDebts(): Promise<JsonApiCollection<Debt>> {
    const { data } = await api.get('/api/v1/debts');
    return normalizeCollection<Debt['attributes']>(data) as JsonApiCollection<Debt>;
  },

  async fetchBudgets(month = defaultMonth, year = defaultYear): Promise<JsonApiCollection<Budget>> {
    const { data } = await api.get('/api/v1/budgets', { params: { month, year } });
    return normalizeCollection<Budget['attributes']>(data) as JsonApiCollection<Budget>;
  },

  async fetchIncomeSources(): Promise<JsonApiCollection<IncomeSource>> {
    const { data } = await api.get('/api/v1/income_sources');
    return normalizeCollection<IncomeSource['attributes']>(data) as JsonApiCollection<IncomeSource>;
  },

  async fetchRecurringObligations(): Promise<JsonApiCollection<RecurringObligation>> {
    const { data } = await api.get('/api/v1/recurring_obligations');
    return normalizeCollection<RecurringObligation['attributes']>(data) as JsonApiCollection<RecurringObligation>;
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
    await api.delete(`/api/v1/transactions/${id}`);
  },
};
