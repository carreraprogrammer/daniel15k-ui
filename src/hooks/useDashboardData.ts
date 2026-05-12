import { useCallback, useEffect, useMemo, useState } from 'react';
import { financeService } from '../services/financeService';
import type { AgentInsight, CategoryResource, CompletenessResponse, Debt, RecurringObligation, SummaryResponse, Transaction, UserMilestone } from '../types/finance.types';
import { buildCategoryLookup, buildBehaviorSignals, summarizeBehavior } from '../utils/financeBehavior';

export const useDashboardData = () => {
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [insight, setInsight] = useState<AgentInsight | null>(null);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [pending, setPending] = useState<Transaction[]>([]);
  const [obligations, setObligations] = useState<RecurringObligation[]>([]);
  const [completeness, setCompleteness] = useState<CompletenessResponse | null>(null);
  const [monthTransactions, setMonthTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<CategoryResource[]>([]);
  const [milestones, setMilestones] = useState<UserMilestone[]>([]);
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
        insightResponse,
        completenessResponse,
        milestonesResponse,
      ] = await Promise.all([
        financeService.fetchDebts(),
        financeService.fetchPendingTransactions(),
        financeService.fetchRecurringObligations(),
        financeService.fetchTransactions({ page: 1, per_page: 50, sort_by: 'date', sort_dir: 'desc' }),
        financeService.fetchCategories(),
        financeService.fetchLatestInsight().catch(() => null),
        financeService.fetchCompleteness().catch(() => null),
        financeService.fetchMilestones().catch(() => []),
      ]);
      setDebts(debtsResponse.data);
      setPending(pendingResponse.data);
      setObligations(obligationsResponse.data);
      setMonthTransactions(transactionsResponse.data);
      setCategories(categoriesResponse.data);
      setInsight(insightResponse);
      setCompleteness(completenessResponse);
      setMilestones(milestonesResponse);
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
    insight,
    debts,
    pending,
    obligations,
    monthTransactions,
    completeness,
    milestones,
    loading,
    error,
    behaviorSummary,
    behaviorSignals,
    reload: () => void load(),
  };
};
