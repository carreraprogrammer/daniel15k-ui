import { api } from './api';
import type {
  Budget,
  Debt,
  IncomeSource,
  JsonApiCollection,
  RecurringObligation,
  SummaryResponse,
  Transaction,
} from '../types/finance.types';

const now = new Date();
const defaultMonth = now.getMonth() + 1;
const defaultYear = now.getFullYear();

export const financeService = {
  async fetchSummary(month = defaultMonth, year = defaultYear): Promise<SummaryResponse> {
    const { data } = await api.get('/api/v1/summary', { params: { month, year } });
    return data as SummaryResponse;
  },

  async fetchTransactions(month = defaultMonth, year = defaultYear): Promise<JsonApiCollection<Transaction>> {
    const { data } = await api.get('/api/v1/transactions', { params: { month, year } });
    return data as JsonApiCollection<Transaction>;
  },

  async fetchPendingTransactions(): Promise<JsonApiCollection<Transaction>> {
    const { data } = await api.get('/api/v1/transactions/pending');
    return data as JsonApiCollection<Transaction>;
  },

  async fetchDebts(): Promise<JsonApiCollection<Debt>> {
    const { data } = await api.get('/api/v1/debts');
    return data as JsonApiCollection<Debt>;
  },

  async fetchBudgets(month = defaultMonth, year = defaultYear): Promise<JsonApiCollection<Budget>> {
    const { data } = await api.get('/api/v1/budgets', { params: { month, year } });
    return data as JsonApiCollection<Budget>;
  },

  async fetchIncomeSources(): Promise<JsonApiCollection<IncomeSource>> {
    const { data } = await api.get('/api/v1/income_sources');
    return data as JsonApiCollection<IncomeSource>;
  },

  async fetchRecurringObligations(): Promise<JsonApiCollection<RecurringObligation>> {
    const { data } = await api.get('/api/v1/recurring_obligations');
    return data as JsonApiCollection<RecurringObligation>;
  },
};
