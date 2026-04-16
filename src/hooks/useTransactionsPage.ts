import { useEffect, useMemo, useRef, useState } from 'react';
import { financeService } from '../services/financeService';
import type {
  CategoryResource,
  SummaryResponse,
  Transaction,
  TransactionCreatePayload,
  TransactionQueryParams,
  TransactionUpdatePayload,
} from '../types/finance.types';
import { buildCategoryLookup, buildBehaviorSignals, summarizeBehavior } from '../utils/financeBehavior';

export const initialTransactionFilters: TransactionQueryParams = {
  q: '',
  status: '',
  transaction_type: '',
  source: '',
  sort_by: 'date',
  sort_dir: 'desc',
};

const PAGE_SIZE = 20;

export const useTransactionsPage = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [categories, setCategories] = useState<CategoryResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<TransactionQueryParams>(initialTransactionFilters);
  const [draftFilters, setDraftFilters] = useState<TransactionQueryParams>(initialTransactionFilters);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const load = async (nextPage = 1, options?: { append?: boolean; withSummary?: boolean }) => {
    const append = options?.append ?? false;
    const withSummary = options?.withSummary ?? nextPage === 1;

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const [transactionsResponse, summaryResponse] = await Promise.all([
        financeService.fetchTransactions({ ...filters, page: nextPage, per_page: PAGE_SIZE }),
        withSummary ? financeService.fetchSummary() : Promise.resolve(null),
      ]);

      setTransactions((current) =>
        append ? [...current, ...transactionsResponse.data] : transactionsResponse.data,
      );
      setPage(transactionsResponse.meta?.page ?? nextPage);
      setHasNextPage(Boolean(transactionsResponse.meta?.has_next_page));
      setTotalResults(transactionsResponse.meta?.total ?? transactionsResponse.data.length);

      if (summaryResponse) {
        setSummary(summaryResponse);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar las transacciones.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    void load();
  }, [filters]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await financeService.fetchCategories();
        setCategories(response.data);
      } catch (categoryError) {
        console.error('[useTransactionsPage] loadCategories:error', categoryError);
      }
    };

    void loadCategories();
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || loading || loadingMore || !hasNextPage) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) {
          return;
        }

        void load(page + 1, { append: true, withSummary: false });
      },
      {
        root: null,
        rootMargin: '0px 0px 320px 0px',
        threshold: 0.1,
      },
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [hasNextPage, loading, loadingMore, page]);

  const createTransaction = async (payload: TransactionCreatePayload) => {
    setSubmitting(true);
    try {
      await financeService.createTransaction(payload);
      await load(1, { withSummary: true });
    } finally {
      setSubmitting(false);
    }
  };

  const updateTransaction = async (id: string, payload: TransactionUpdatePayload) => {
    setSubmitting(true);
    try {
      await financeService.updateTransaction(id, payload);
      await load(1, { withSummary: true });
    } finally {
      setSubmitting(false);
    }
  };

  const deleteTransaction = async (transaction: Transaction) => {
    setSubmitting(true);
    try {
      await financeService.deleteTransaction(transaction.id);
      await load(1, { withSummary: true });
    } finally {
      setSubmitting(false);
    }
  };

  const metrics = useMemo(() => {
    const incomeTotal = transactions
      .filter((transaction) => transaction.attributes.transaction_type === 'income')
      .reduce((sum, transaction) => sum + transaction.attributes.amount, 0);
    const expenseTotal = transactions
      .filter((transaction) => transaction.attributes.transaction_type !== 'income')
      .reduce((sum, transaction) => sum + transaction.attributes.amount, 0);
    const pendingCount = transactions.filter((transaction) => transaction.attributes.status === 'pending').length;

    return {
      count: totalResults,
      incomeTotal,
      expenseTotal,
      pendingCount,
    };
  }, [totalResults, transactions]);

  const categoryLookup = useMemo(() => buildCategoryLookup(categories), [categories]);
  const behaviorSummary = useMemo(() => summarizeBehavior(transactions, categoryLookup), [categoryLookup, transactions]);
  const behaviorSignals = useMemo(() => buildBehaviorSignals(behaviorSummary), [behaviorSummary]);

  const activeFilterCount = useMemo(
    () => [filters.status, filters.transaction_type, filters.source].filter(Boolean).length,
    [filters.source, filters.status, filters.transaction_type],
  );

  const appliedChips = useMemo(() => {
    const chips = [];

    if (filters.q) chips.push({ key: 'q', label: `Buscar: ${filters.q}` });
    if (filters.status) chips.push({ key: 'status', label: `Estado: ${filters.status}` });
    if (filters.transaction_type) {
      chips.push({
        key: 'transaction_type',
        label: filters.transaction_type === 'income' ? 'Tipo: Ingreso' : 'Tipo: Gasto',
      });
    }
    if (filters.source) chips.push({ key: 'source', label: `Origen: ${filters.source}` });

    return chips;
  }, [filters.q, filters.source, filters.status, filters.transaction_type]);

  return {
    transactions,
    summary,
    loading,
    loadingMore,
    submitting,
    error,
    filters,
    draftFilters,
    metrics,
    categoryLookup,
    behaviorSummary,
    behaviorSignals,
    activeFilterCount,
    appliedChips,
    hasNextPage,
    sentinelRef,
    setError,
    setFilters,
    setDraftFilters,
    reload: load,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  };
};
