import { useCallback, useEffect, useMemo, useState } from 'react';
import { financeService } from '../services/financeService';
import type { CategoryResource, Debt, RecurringObligation, SummaryResponse, Transaction } from '../types/finance.types';
import { buildCategoryLookup, buildBehaviorSignals, summarizeBehavior } from '../utils/financeBehavior';

export const useDashboardData = () => {
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [pending, setPending] = useState<Transaction[]>([]);
  const [obligations, setObligations] = useState<RecurringObligation[]>([]);
  const [monthTransactions, setMonthTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<CategoryResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Carga crítica: summary desbloquea el render principal
      const summaryResponse = await financeService.fetchSummary();
      setSummary(summaryResponse);
      setLoading(false);

      // Carga secundaria en paralelo sin bloquear UI
      const [
        debtsResponse,
        pendingResponse,
        obligationsResponse,
        transactionsResponse,
        categoriesResponse,
      ] = await Promise.all([
        financeService.fetchDebts(),
        financeService.fetchPendingTransactions(),
        financeService.fetchRecurringObligations(),
        financeService.fetchTransactions({ page: 1, per_page: 50, sort_by: 'date', sort_dir: 'desc' }),
        financeService.fetchCategories(),
      ]);
      setDebts(debtsResponse.data);
      setPending(pendingResponse.data);
      setObligations(obligationsResponse.data);
      setMonthTransactions(transactionsResponse.data);
      setCategories(categoriesResponse.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar el resumen financiero.');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const categoryLookup = useMemo(() => buildCategoryLookup(categories), [categories]);
  const behaviorSummary = useMemo(
    () => summarizeBehavior(monthTransactions, categoryLookup),
    [categoryLookup, monthTransactions],
  );
  const behaviorSignals = useMemo(() => buildBehaviorSignals(behaviorSummary), [behaviorSummary]);

  return {
    summary,
    debts,
    pending,
    obligations,
    loading,
    error,
    behaviorSummary,
    behaviorSignals,
    reload: () => void load(),
  };
};
