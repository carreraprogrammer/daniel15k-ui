import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { IonContent, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, useIonAlert, useIonToast } from '@ionic/react';
import { addOutline, optionsOutline, warningOutline } from 'ionicons/icons';
import { AppLayout } from '../../templates/AppLayout';
import { useAppToolbar } from '../../templates/AppLayout/AppLayoutContext';
import { BreadcrumbTrail } from '../../organisms/BreadcrumbTrail';
import { Button } from '../../atoms/Button';
import { Spinner } from '../../atoms/Spinner';
import { SelectInput } from '../../atoms/SelectInput';
import { ErrorState } from '../../molecules/ErrorState';
import { EmptyState } from '../../molecules/EmptyState';
import { CrudModal } from '../../molecules/CrudModal';
import { AppliedFiltersBar } from '../../molecules/AppliedFiltersBar';
import { SortSheet } from '../../molecules/SortSheet';
import { TransactionComposer } from '../../organisms/TransactionComposer';
import { TransactionSlidingCard } from '../../organisms/TransactionSlidingCard';
import type { IncomeSource, RecurringObligation, SinkingFund, Transaction, TransactionCreatePayload, TransactionUpdatePayload } from '../../../types/finance.types';
import { getCategoryDisplayName } from '../../../utils/categoryLabels';
import { resolveTransactionCategory } from '../../../utils/financeBehavior';
import { useAgentUI } from '../../../contexts/AgentUIContext';
import { initialTransactionFilters, useTransactionsPage } from '../../../hooks/useTransactionsPage';
import { formatCurrencyCompact, formatCurrencyFull } from '../../../utils/formatCurrency';
import { financeService } from '../../../services/financeService';
import formStyles from '../../organisms/ComposerForm.module.css';
import styles from '../FinancePage.module.css';

const periodFormatter = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' });
const dayFormatter = new Intl.DateTimeFormat('es-CO', { weekday: 'short', day: 'numeric' });

const padMonth = (month: number) => String(month).padStart(2, '0');

const periodKey = (year: number, month: number) => `${year}-${padMonth(month)}`;

const shiftPeriod = (year: number, month: number, offset: number) => {
  const date = new Date(year, month - 1 + offset, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
};

const parsePeriodKey = (value: string) => {
  const match = value.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]) };
};

const transactionPeriod = (transaction: Transaction) => {
  if (transaction.attributes.year && transaction.attributes.month) {
    return { year: transaction.attributes.year, month: transaction.attributes.month };
  }

  const rawDate = transaction.attributes.date;
  const isoMatch = rawDate.match(/^(\d{4})-(\d{2})-\d{2}/);
  if (isoMatch) return { year: Number(isoMatch[1]), month: Number(isoMatch[2]) };

  const localMatch = rawDate.match(/^\d{2}\/(\d{2})\/(\d{4})/);
  if (localMatch) return { year: Number(localMatch[2]), month: Number(localMatch[1]) };

  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
};

const resolveTransactionDate = (transaction: Transaction) => {
  const rawDate = transaction.attributes.date;
  const isoMatch = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
  }

  const localMatch = rawDate.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (localMatch) {
    return new Date(Number(localMatch[3]), Number(localMatch[2]) - 1, Number(localMatch[1]));
  }

  const localDayMonthMatch = rawDate.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (localDayMonthMatch) {
    const period = transactionPeriod(transaction);
    return new Date(period.year, Number(localDayMonthMatch[2]) - 1, Number(localDayMonthMatch[1]));
  }

  return new Date(rawDate);
};

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const transactionDateTime = (transaction: Transaction) => {
  const date = resolveTransactionDate(transaction);
  if (Number.isNaN(date.getTime())) return null;
  return startOfDay(date).getTime();
};

const compareTransactionsByDate = (
  a: Transaction,
  b: Transaction,
  direction: 'asc' | 'desc',
) => {
  const aTime = transactionDateTime(a);
  const bTime = transactionDateTime(b);

  if (aTime !== null && bTime !== null && aTime !== bTime) {
    return direction === 'asc' ? aTime - bTime : bTime - aTime;
  }

  if (aTime !== null && bTime === null) return -1;
  if (aTime === null && bTime !== null) return 1;

  const aCreated = new Date(a.attributes.created_at ?? '').getTime();
  const bCreated = new Date(b.attributes.created_at ?? '').getTime();

  if (!Number.isNaN(aCreated) && !Number.isNaN(bCreated) && aCreated !== bCreated) {
    return direction === 'asc' ? aCreated - bCreated : bCreated - aCreated;
  }

  return 0;
};

const formatTransactionDayLabel = (transaction: Transaction) => {
  const date = resolveTransactionDate(transaction);
  if (Number.isNaN(date.getTime())) return transaction.attributes.date;
  const target = startOfDay(date);
  const today = startOfDay(new Date());
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86_400_000);

  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';

  const formatted = dayFormatter.format(date).replace(/[.,]/g, '');
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

const appliedPeriodFor = (transaction: Transaction) => {
  const metadata = transaction.attributes.metadata ?? {};
  const explicitPeriod = typeof metadata.applies_to_period === 'string' ? metadata.applies_to_period : null;
  if (explicitPeriod?.match(/^\d{4}-\d{2}$/)) return explicitPeriod;

  const explicitYear = Number(metadata.applies_to_year);
  const explicitMonth = Number(metadata.applies_to_month);
  if (explicitYear > 0 && explicitMonth > 0) return periodKey(explicitYear, explicitMonth);

  const base = transactionPeriod(transaction);
  return periodKey(base.year, base.month);
};

const periodOptionsFor = (transaction: Transaction | null) => {
  if (!transaction) return [];

  const base = transactionPeriod(transaction);
  const keys = new Set<string>();
  [0, 1, -1, 2].forEach((offset) => {
    const period = shiftPeriod(base.year, base.month, offset);
    keys.add(periodKey(period.year, period.month));
  });
  keys.add(appliedPeriodFor(transaction));

  return Array.from(keys).map((key) => {
    const parsed = parsePeriodKey(key)!;
    const label = periodFormatter.format(new Date(parsed.year, parsed.month - 1, 1));
    return { label: label.charAt(0).toUpperCase() + label.slice(1), value: key };
  });
};

type ExpenseLinkKind = 'recurring_obligation' | 'sinking_fund';

export const TransactionsContent = () => {
  const [composerOpen, setComposerOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [linkingTransaction, setLinkingTransaction] = useState<Transaction | null>(null);
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [obligations, setObligations] = useState<RecurringObligation[]>([]);
  const [sinkingFunds, setSinkingFunds] = useState<SinkingFund[]>([]);
  const [expenseLinkKind, setExpenseLinkKind] = useState<ExpenseLinkKind>('recurring_obligation');
  const [selectedLinkId, setSelectedLinkId] = useState('');
  const [selectedLinkPeriod, setSelectedLinkPeriod] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkSubmitting, setLinkSubmitting] = useState(false);
  const [linkOptionsLoading, setLinkOptionsLoading] = useState(false);
  const [presentAlert] = useIonAlert();
  const [presentToast] = useIonToast();

  const {
    transactions,
    summary,
    categories,
    loading,
    submitting,
    error,
    filters,
    metrics,
    categoryLookup,
    appliedChips,
    hasNextPage,
    period,
    setPeriod,
    loadMore,
    setError,
    setFilters,
    reload,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  } = useTransactionsPage();

  const { dataVersion } = useAgentUI();
  useEffect(() => { if (dataVersion > 0) void reload(); }, [dataVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadLinkOptions = useCallback(async () => {
    setLinkOptionsLoading(true);
    try {
      const [srcRes, obRes, fundsRes] = await Promise.all([
        financeService.fetchIncomeSources({ active: 'all' }),
        financeService.fetchRecurringObligations({ active: 'all', sort_by: 'due_day', sort_dir: 'asc' }),
        financeService.getSinkingFunds(),
      ]);
      setIncomeSources(srcRes.data);
      setObligations(obRes.data);
      setSinkingFunds(fundsRes);
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : 'No fue posible cargar las relaciones disponibles.');
    } finally {
      setLinkOptionsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLinkOptions();
  }, [loadLinkOptions]);

  const TYPE_LABELS: Record<string, string> = {
    committed:     'Comprometido',
    necessary:     'Necesario',
    discretionary: 'Flexible',
    investment:    'Inversión',
    social:        'Social',
  };
  const TYPE_ORDER = ['committed', 'necessary', 'discretionary', 'investment', 'social'];
  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const todayPeriod = { month: new Date().getMonth() + 1, year: new Date().getFullYear() };
  const monthName = `${MESES[period.month - 1]} ${period.year}`;
  const isCurrentPeriod = period.month === todayPeriod.month && period.year === todayPeriod.year;

  const stackedSegments = useMemo(() => {
    const byType: Record<string, { spent: number; color: string; label: string }> = {};
    transactions
      .filter((t) => t.attributes.transaction_type === 'expense')
      .forEach((t) => {
        const catId = t.attributes.category_id;
        if (!catId) return;
        const cat = categories.find((c) => String(c.id) === String(catId));
        const type = cat?.attributes.category_type ?? 'other';
        const color = cat?.attributes.color ?? 'var(--surface-control-hover)';
        if (!byType[type]) byType[type] = { spent: 0, color, label: TYPE_LABELS[type] ?? 'Otro' };
        byType[type].spent += t.attributes.amount;
      });
    const total = Object.values(byType).reduce((s, g) => s + g.spent, 0);
    if (total === 0) return [];
    return Object.entries(byType)
      .map(([type, g]) => ({ type, ...g, pct: (g.spent / total) * 100 }))
      .sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type));
  }, [transactions, categories]); // eslint-disable-line react-hooks/exhaustive-deps

  const spotlight = useMemo(() => {
    const cats = summary?.burn_rate?.categories;
    if (!cats?.length) return null;
      let target;
      const over = cats.filter((c) => !c.on_track && c.budget > 0);
      if (over.length) {
        target = over.reduce((a, b) => (a.pct > b.pct ? a : b));
      } else {
        const withBudget = cats.filter((c) => c.budget > 0);
        if (withBudget.length) target = withBudget.reduce((a, b) => (a.pct > b.pct ? a : b));
        else target = cats.reduce((a, b) => (a.spent > b.spent ? a : b));
      }
      
      const catObj = categories.find(c => String(c.id) === String(target.category_id));
      return { ...target, color: catObj?.attributes.color };
    }, [summary, categories]);
  // ── Confirmación de un tap: candidatas del agente por código ─────────────
  const subcategoryNameByCode = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach((category) => {
      (category.relationships?.subcategories?.data ?? []).forEach((sub) => {
        if (sub.attributes?.code) map[sub.attributes.code] = sub.attributes.name ?? sub.attributes.code;
      });
    });
    return map;
  }, [categories]);

  const suggestedFor = useCallback((transaction: Transaction) => {
    const raw = transaction.attributes.metadata?.suggested_subcategories;
    if (!Array.isArray(raw)) return undefined;
    const items = raw
      .filter((code): code is string => typeof code === 'string' && code.length > 0)
      .map((code) => ({ code, name: subcategoryNameByCode[code] ?? code }));
    return items.length > 0 ? items : undefined;
  }, [subcategoryNameByCode]);

  const handleQuickConfirm = useCallback(async (transaction: Transaction, subcategoryCode?: string) => {
    try {
      await financeService.confirmTransaction(transaction.id, subcategoryCode);
      void presentToast({ message: 'Confirmada ✓', duration: 1500, position: 'bottom' });
      void reload();
    } catch (err) {
      void presentToast({
        message: err instanceof Error ? err.message : 'No fue posible confirmar la transacción.',
        duration: 2500,
        position: 'bottom',
        color: 'danger',
      });
    }
  }, [reload]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedCategoryId = filters.category_id ? String(filters.category_id) : '';
  const categoryFilters = useMemo(
    () => categories.map((category) => ({
      id: String(category.id),
      name: getCategoryDisplayName({
        name: category.attributes.name,
        code: category.attributes.code,
        type: category.attributes.category_type,
      }),
      color: category.attributes.color ?? '#7ce0d3',
    })),
    [categories],
  );
  const visibleAppliedChips = useMemo(
    () => appliedChips.filter((chip) => chip.key !== 'category_id' && chip.key !== 'subcategory_id'),
    [appliedChips],
  );
  const groupedTransactions = useMemo(() => {
    const groups: Array<{ key: string; label: string; items: Transaction[] }> = [];
    const indexByKey = new Map<string, number>();
    const orderedTransactions = filters.sort_by === 'date'
      ? [...transactions].sort((a, b) => compareTransactionsByDate(a, b, filters.sort_dir ?? 'desc'))
      : transactions;

    orderedTransactions.forEach((transaction) => {
      const date = resolveTransactionDate(transaction);
      const key = Number.isNaN(date.getTime()) ? transaction.attributes.date : startOfDay(date).toISOString();
      const existingIndex = indexByKey.get(key);

      if (existingIndex === undefined) {
        indexByKey.set(key, groups.length);
        groups.push({
          key,
          label: formatTransactionDayLabel(transaction),
          items: [transaction],
        });
        return;
      }

      groups[existingIndex].items.push(transaction);
    });

    return groups;
  }, [filters.sort_by, filters.sort_dir, transactions]);
  const activeFilterCount = useMemo(
    () => visibleAppliedChips.filter((chip) => chip.key !== 'q').length + (selectedCategoryId ? 1 : 0),
    [selectedCategoryId, visibleAppliedChips],
  );
  const monthBalance = metrics.incomeTotal - metrics.expenseTotal;
  const carryover = summary?.balance.carryover_from_previous_month ?? 0;
  const realAvailable = summary?.balance.net_balance ?? monthBalance;
  const linkPeriodOptions = useMemo(() => periodOptionsFor(linkingTransaction), [linkingTransaction]);
  const toolbar = useMemo(
    () => ({
      title: 'Movimientos',
      subtitle: monthName,
      searchPlaceholder: 'Concepto o producto',
      searchValue: filters.q ?? '',
      resultLabel: `${metrics.count} resultados`,
      onSearchChange: (q: string) => {
        setDetailsOpen(true);
        setFilters((current) => ({ ...current, q }));
      },
      actions: [
        {
          key: 'sort',
          label: 'Ordenar',
          icon: <IonIcon icon={optionsOutline} />,
          onClick: () => {
            setDetailsOpen(true);
            setSortOpen(true);
          },
        },
      ],
    }),
    [filters.q, metrics.count, monthName, setFilters],
  );

  useAppToolbar(toolbar);

  const handleCreate = async (payload: TransactionCreatePayload) => {
    try {
      await createTransaction(payload);
      setComposerOpen(false);
      await presentToast({
        message: 'Transacción guardada con éxito',
        duration: 2200,
        color: 'success',
        position: 'top',
      });
    } catch (nextError) {
      await presentToast({
        message: nextError instanceof Error ? nextError.message : 'No se pudo guardar la transacción',
        duration: 2600,
        color: 'danger',
        position: 'top',
      });
      throw nextError;
    }
  };

  const handleUpdate = async (id: string, payload: TransactionUpdatePayload) => {
    try {
      await updateTransaction(id, payload);
      setEditingTransaction(null);
      setComposerOpen(false);
      await presentToast({
        message: 'Transacción actualizada con éxito',
        duration: 2200,
        color: 'success',
        position: 'top',
      });
    } catch (nextError) {
      await presentToast({
        message: nextError instanceof Error ? nextError.message : 'No se pudo actualizar la transacción',
        duration: 2600,
        color: 'danger',
        position: 'top',
      });
      throw nextError;
    }
  };

  const handleDelete = async (transaction: Transaction) => {
    console.debug('[TransactionsPage] handleDelete:start', {
      id: transaction.id,
      concept: transaction.attributes.concept,
    });
    try {
      await deleteTransaction(transaction);
      console.debug('[TransactionsPage] handleDelete:success', { id: transaction.id });
      if (editingTransaction?.id === transaction.id) {
        setEditingTransaction(null);
      }
      await presentToast({
        message: 'Transacción borrada con éxito',
        duration: 2200,
        color: 'success',
        position: 'top',
      });
    } catch (deleteError) {
      console.error('[TransactionsPage] handleDelete:error', deleteError);
      setError(deleteError instanceof Error ? deleteError.message : 'No fue posible borrar la transacción.');
      await presentToast({
        message: 'No se pudo borrar la transacción',
        duration: 2600,
        color: 'danger',
        position: 'top',
      });
    }
  };

  const requestDelete = async (transaction: Transaction) => {
    console.debug('[TransactionsPage] requestDelete', {
      id: transaction.id,
      concept: transaction.attributes.concept,
      amount: transaction.attributes.amount,
    });

    await presentAlert({
      cssClass: 'brand-alert',
      header: 'Borrar transacción',
      message: `¿Seguro que quieres borrar "${transaction.attributes.concept}" por ${formatCurrencyFull(transaction.attributes.amount)}?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          handler: () => {
            console.debug('[TransactionsPage] requestDelete:cancelled', { id: transaction.id });
          },
        },
        {
          text: 'Borrar',
          role: 'destructive',
          handler: () => {
            console.debug('[TransactionsPage] requestDelete:confirmed', { id: transaction.id });
            void handleDelete(transaction);
          },
        },
      ],
    });
  };

  const handleOpenLink = (transaction: Transaction) => {
    const isIncome = transaction.attributes.transaction_type === 'income';
    const nextExpenseLinkKind: ExpenseLinkKind = transaction.attributes.sinking_fund_id
      ? 'sinking_fund'
      : 'recurring_obligation';
    const currentId = isIncome
      ? transaction.attributes.income_source_id
      : nextExpenseLinkKind === 'sinking_fund'
        ? transaction.attributes.sinking_fund_id
        : transaction.attributes.recurring_obligation_id;
    setLinkingTransaction(transaction);
    setExpenseLinkKind(nextExpenseLinkKind);
    setSelectedLinkId(currentId ? String(currentId) : '');
    setSelectedLinkPeriod(appliedPeriodFor(transaction));
    setLinkError(null);
    if (
      (isIncome && incomeSources.length === 0) ||
      (!isIncome && (obligations.length === 0 || sinkingFunds.length === 0))
    ) {
      void loadLinkOptions();
    }
  };

  const handleCloseLinkModal = () => {
    setLinkingTransaction(null);
    setSelectedLinkId('');
    setSelectedLinkPeriod('');
    setLinkError(null);
  };

  const handleSaveLink = async () => {
    if (!linkingTransaction) return;
    setLinkSubmitting(true);
    setLinkError(null);
    const isIncome = linkingTransaction.attributes.transaction_type === 'income';
    const selectedPeriod = parsePeriodKey(selectedLinkPeriod) ?? transactionPeriod(linkingTransaction);
    const metadata: Record<string, unknown> = {
      ...(linkingTransaction.attributes.metadata ?? {}),
    };

    if (selectedLinkId) {
      metadata.applies_to_period = periodKey(selectedPeriod.year, selectedPeriod.month);
      metadata.applies_to_month = selectedPeriod.month;
      metadata.applies_to_year = selectedPeriod.year;
    } else {
      delete metadata.applies_to_period;
      delete metadata.applies_to_month;
      delete metadata.applies_to_year;
    }

    try {
      const payload = isIncome
        ? { income_source_id: selectedLinkId ? Number(selectedLinkId) : null, metadata }
        : expenseLinkKind === 'sinking_fund'
          ? {
              sinking_fund_id: selectedLinkId ? Number(selectedLinkId) : null,
              recurring_obligation_id: null,
              metadata,
            }
          : {
              recurring_obligation_id: selectedLinkId ? Number(selectedLinkId) : null,
              sinking_fund_id: null,
              metadata,
            };
      await financeService.linkTransaction(linkingTransaction.id, payload);
      handleCloseLinkModal();
      void reload();
      await presentToast({
        message: selectedLinkId ? 'Vínculo guardado con éxito' : 'Vínculo eliminado',
        duration: 2200,
        color: 'success',
        position: 'top',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No fue posible guardar el vínculo.';
      setLinkError(message);
      await presentToast({
        message,
        duration: 2600,
        color: 'danger',
        position: 'top',
      });
    } finally {
      setLinkSubmitting(false);
    }
  };

  const removeChip = (key: string) => {
    const next = { ...filters, [key]: '' };
    if (key === 'category_id') {
      next.subcategory_id = '';
    }
    setFilters(next);
  };

  return (
    <>
      <IonContent className={styles.pageContent}>
      <section className={`${styles.stack} ${!detailsOpen ? styles.stackFill : ''}`}>
        {!detailsOpen ? (
          <div className={styles.focusStage}>
            <div className={`${styles.focusCard} ${styles.focusCardFull}`}>

              {/* Header */}
              <div className={styles.focusGrid}>
                <div className={styles.focusCopy}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => setPeriod(shiftPeriod(period.year, period.month, -1))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', color: 'inherit', fontSize: '1rem', opacity: 0.7 }}
                    >‹</button>
                    <span className={styles.eyebrow}>{monthName}</span>
                    <button
                      onClick={() => { if (!isCurrentPeriod) setPeriod(shiftPeriod(period.year, period.month, 1)); }}
                      style={{ background: 'none', border: 'none', cursor: isCurrentPeriod ? 'default' : 'pointer', padding: '0 4px', color: 'inherit', fontSize: '1rem', opacity: isCurrentPeriod ? 0.2 : 0.7 }}
                    >›</button>
                  </div>
                  <div className={styles.monthCompareGrid}>
                    <div className={styles.monthCompareItem}>
                      <span className={styles.monthCompareLabel}>Ingresos</span>
                      <strong className={`${styles.monthCompareValue} ${styles.monthCompareIncome}`}>
                        {formatCurrencyCompact(metrics.incomeTotal)}
                      </strong>
                    </div>
                    <div className={styles.monthCompareItem}>
                      <span className={styles.monthCompareLabel}>Gastos</span>
                      <strong className={styles.monthCompareValue}>
                        {formatCurrencyCompact(metrics.expenseTotal)}
                      </strong>
                    </div>
                  </div>
                  <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <p className={styles.focusCaption}>
                      Balance del mes:{' '}
                      <span className={monthBalance < 0 ? styles.statusWarn : styles.statusGood}>
                        {formatCurrencyCompact(monthBalance)}
                      </span>
                    </p>
                    {carryover !== 0 && (
                      <p className={styles.focusCaption}>
                        Saldo arrastrado:{' '}
                        <span className={carryover < 0 ? styles.statusWarn : styles.statusGood}>
                          {carryover > 0 ? '+' : ''}{formatCurrencyCompact(carryover)}
                        </span>
                      </p>
                    )}
                    <p className={styles.focusCaption} style={{ fontWeight: 600 }}>
                      Disponible real:{' '}
                      <span className={realAvailable < 0 ? styles.statusWarn : styles.statusGood}>
                        {formatCurrencyCompact(realAvailable)}
                      </span>
                    </p>
                  </div>
                </div>
                <div className={styles.focusMeta} style={{ alignSelf: 'start', justifyContent: 'flex-end' }}>
                  {metrics.pendingCount > 0 ? (
                    <span className={styles.focusBadge}>{metrics.pendingCount} pendientes</span>
                  ) : null}
                  <span className={styles.focusBadge}>{metrics.count} movimientos</span>
                </div>
              </div>

              {/* Stacked spend bar */}
              {stackedSegments.length > 0 ? (
                <div className={styles.spendWrap}>
                  <div className={styles.spendBar}>
                    {stackedSegments.map((seg) => (
                      <div
                        key={seg.type}
                        className={styles.spendSegment}
                        style={{ width: `${seg.pct}%`, background: seg.color }}
                        title={`${seg.label}: ${formatCurrencyCompact(seg.spent)}`}
                      />
                    ))}
                  </div>
                  <div className={styles.spendLegend}>
                    {stackedSegments.map((seg) => (
                      <div key={seg.type} className={styles.spendLegendItem}>
                        <span className={styles.spendLegendDot} style={{ background: seg.color }} />
                        <span className={styles.spendLegendLabel}>{seg.label}</span>
                        <span className={styles.spendLegendAmount}>{formatCurrencyCompact(seg.spent)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Spotlight */}
              {spotlight ? (
                  <div
                    className={`${styles.focusSupport} ${!spotlight.on_track ? styles.focusSupportWarn : ''}`}
                    style={spotlight.color ? { '--category-accent': spotlight.color } as React.CSSProperties : undefined}
                  >
                  <div className={styles.focusSupportHeader}>
                    <h3 className={styles.focusSupportTitle}>
                      {!spotlight.on_track ? <IonIcon icon={warningOutline} aria-hidden="true" /> : null}
                      {spotlight.category}
                    </h3>
                    <span className={styles.focusSupportValue}>{formatCurrencyCompact(spotlight.spent)}</span>
                  </div>
                  {spotlight.budget > 0 ? (
                    <>
                      <div
                        className={styles.focusRail}
                        role="progressbar"
                        aria-valuenow={Math.min(spotlight.pct, 100)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${spotlight.category}: ${spotlight.pct}% del presupuesto`}
                      >
                        <div
                          className={`${styles.focusRailFill} ${!spotlight.on_track ? styles.focusRailFillWarn : ''}`}
                          style={{ width: `${Math.min(spotlight.pct, 100)}%` }}
                        />
                      </div>
                      <p className={styles.focusSupportText}>
                        {spotlight.pct}% de {formatCurrencyCompact(spotlight.budget)} presupuestados
                          {!spotlight.on_track ? (spotlight.pct >= 100 ? ' — ya se superó' : ' — va a superarse') : ''}
                      </p>
                    </>
                  ) : (
                    <p className={styles.focusSupportText}>mayor gasto del mes</p>
                  )}
                </div>
              ) : null}

              {/* Actions */}
              <div className={styles.focusActions}>
                <Button
                  label="Nueva transacción"
                  variant="primary"
                  iconLeft={<IonIcon icon={addOutline} />}
                  onClick={() => {
                    setEditingTransaction(null);
                    setComposerOpen(true);
                  }}
                />
                <Button
                  label="Explorar detalle"
                  variant="ghost"
                  onClick={() => setDetailsOpen(true)}
                />
              </div>

            </div>
          </div>
        ) : null}

        {detailsOpen ? (
          <div className={styles.detailStage}>
            <BreadcrumbTrail items={[
              { label: 'Transacciones', onClick: () => setDetailsOpen(false) },
              { label: monthName },
            ]} />
            <div className={styles.detailPanel}>
              <section className={styles.inlineCategoryFilters}>
                <div className={styles.categoryRailScroller}>
                  <div className={styles.categoryRail}>
                    <button
                      type="button"
                      className={[styles.categoryToken, !selectedCategoryId ? styles.categoryTokenActive : ''].filter(Boolean).join(' ')}
                      style={{ '--category-accent': 'var(--color-brand)' } as CSSProperties}
                      onClick={() => setFilters((current) => ({ ...current, category_id: '', subcategory_id: '' }))}
                    >
                      <span className={styles.categoryTokenText}>Todo</span>
                    </button>
                    {categoryFilters.map((category) => {
                      const active = category.id === selectedCategoryId;
                      return (
                        <button
                          key={category.id}
                          type="button"
                          className={[styles.categoryToken, active ? styles.categoryTokenActive : ''].filter(Boolean).join(' ')}
                          style={{ '--category-accent': category.color } as CSSProperties}
                          onClick={() => setFilters((current) => ({
                            ...current,
                            category_id: category.id,
                            subcategory_id: '',
                          }))}
                        >
                          <span className={styles.categorySwatch} />
                          <span className={styles.categoryTokenText}>{category.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>

            <AppliedFiltersBar
              chips={visibleAppliedChips}
              onRemove={removeChip}
              onClearAll={() => {
                setFilters(initialTransactionFilters);
              }}
            />
            {!loading && !error && transactions.length ? (
              <div className={styles.transactionDayGroups}>
                {groupedTransactions.map((group) => (
                  <section key={group.key} className={styles.transactionDaySection}>
                    <h3 className={styles.transactionDayLabel}>{group.label}</h3>
                    <div className={styles.transactionGroupCard}>
                      {group.items.map((transaction) => (
                        <TransactionSlidingCard
                          key={transaction.id}
                          variant="grouped"
                          transaction={transaction}
                          category={resolveTransactionCategory(transaction, categoryLookup)}
                          linkedLabel={
                            transaction.attributes.transaction_type === 'income'
                              ? (incomeSources.find((s) => String(s.id) === String(transaction.attributes.income_source_id))?.attributes.name ?? null)
                              : transaction.attributes.sinking_fund_id
                                ? (sinkingFunds.find((f) => String(f.id) === String(transaction.attributes.sinking_fund_id))?.name ?? null)
                                : (obligations.find((o) => String(o.id) === String(transaction.attributes.recurring_obligation_id))?.attributes.name ?? null)
                          }
                          onEdit={(nextTransaction) => {
                            setEditingTransaction(nextTransaction);
                            setComposerOpen(true);
                          }}
                          onDelete={(selectedTransaction) => {
                            void requestDelete(selectedTransaction);
                          }}
                          onLink={(tx) => { handleOpenLink(tx); }}
                          onQuickConfirm={(tx, code) => { void handleQuickConfirm(tx, code); }}
                          suggestedSubcategories={suggestedFor(transaction)}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : null}
            </div>
          </div>
        ) : null}

        {loading ? <div className={styles.centeredState}><Spinner size="lg" /></div> : null}
        {error ? <ErrorState message={error} onRetry={() => void reload()} /> : null}
        {!loading && !error && !transactions.length ? (
          <EmptyState
            title="No hay transacciones en este período"
            description={activeFilterCount || filters.q ? 'No encontramos movimientos con esos filtros. Limpia criterios o registra una transacción nueva.' : 'Empieza registrando el primer movimiento del período para ver progreso y lectura conductual.'}
            actionLabel={activeFilterCount || filters.q ? 'Limpiar filtros' : 'Nueva transacción'}
            onAction={() => {
              if (activeFilterCount || filters.q) {
                setFilters(initialTransactionFilters);
                return;
              }
              setEditingTransaction(null);
              setComposerOpen(true);
            }}
          />
        ) : null}

      </section>

      {detailsOpen ? (
        <IonInfiniteScroll
          onIonInfinite={async (ev) => {
            await loadMore();
            void ev.target.complete();
          }}
          threshold="200px"
          disabled={!hasNextPage}
        >
          <IonInfiniteScrollContent loadingText="Cargando más transacciones..." />
        </IonInfiniteScroll>
      ) : null}
      </IonContent>

      <SortSheet
        isOpen={sortOpen}
        title="Ordenar transacciones"
        sortBy={String(filters.sort_by ?? 'date')}
        sortDir={(filters.sort_dir as 'asc' | 'desc') ?? 'desc'}
        options={[
          { label: 'Fecha', value: 'date' },
          { label: 'Monto', value: 'amount' },
          { label: 'Concepto', value: 'concept' },
          { label: 'Estado', value: 'status' },
        ]}
        onClose={() => setSortOpen(false)}
        onChangeSortBy={(sort_by) => setFilters((current) => ({ ...current, sort_by }))}
        onChangeSortDir={(sort_dir) => setFilters((current) => ({ ...current, sort_dir }))}
      />

      <CrudModal
        isOpen={composerOpen}
        title={editingTransaction ? 'Editar transacción' : 'Nueva transacción'}
        subtitle="Ajusta contexto, clasificación y subcategoría desde un solo lugar."
        onClose={() => {
          setComposerOpen(false);
          setEditingTransaction(null);
        }}
      >
        <TransactionComposer
          transaction={editingTransaction}
          categories={categories}
          loading={submitting}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onCancel={() => {
            setComposerOpen(false);
            setEditingTransaction(null);
          }}
        />
      </CrudModal>

      <CrudModal
        isOpen={Boolean(linkingTransaction)}
        title={
          linkingTransaction?.attributes.transaction_type === 'income'
            ? `Vincular ingreso: ${linkingTransaction?.attributes.concept ?? ''}`
            : `Vincular gasto: ${linkingTransaction?.attributes.concept ?? ''}`
        }
        subtitle={
          linkingTransaction?.attributes.transaction_type === 'income'
            ? 'Asocia este ingreso a una fuente para que el seguimiento del mes refleje la entrega.'
            : 'Asocia este gasto a una obligación o a un bolsillo para que el seguimiento del mes refleje el destino real.'
        }
        onClose={handleCloseLinkModal}
      >
        <section className={formStyles.panel}>
          <div className={formStyles.section}>
            <div className={formStyles.sectionHeader}>
              <div>
                <p className={formStyles.sectionEyebrow}>Relación estructural</p>
                <h3 className={formStyles.sectionTitle}>
                  {linkingTransaction?.attributes.transaction_type === 'income'
                    ? 'Fuente de ingreso asociada'
                    : expenseLinkKind === 'sinking_fund'
                      ? 'Bolsillo asociado'
                      : 'Obligación recurrente asociada'}
                </h3>
              </div>
            </div>

            {linkingTransaction?.attributes.transaction_type === 'income' ? (
              <SelectInput
                name="tx-link-income-source"
                label="Fuente de ingreso"
                value={selectedLinkId}
                onChange={(value) => setSelectedLinkId(String(value))}
                options={incomeSources.map((src) => ({
                  label: `${src.attributes.name} · ${formatCurrencyCompact(src.attributes.expected_amount)}`,
                  value: src.id,
                }))}
                placeholder="Sin fuente vinculada"
                hint={linkOptionsLoading ? 'Cargando fuentes...' : 'Solo aparecen las fuentes de ingreso registradas.'}
              />
            ) : (
              <>
                <SelectInput
                  name="tx-link-kind"
                  label="Tipo de vínculo"
                  value={expenseLinkKind}
                  onChange={(value) => {
                    setExpenseLinkKind(String(value) as ExpenseLinkKind);
                    setSelectedLinkId('');
                  }}
                  options={[
                    { label: 'Obligación recurrente', value: 'recurring_obligation' },
                    { label: 'Bolsillo', value: 'sinking_fund' },
                  ]}
                />
                {expenseLinkKind === 'sinking_fund' ? (
                  <SelectInput
                    name="tx-link-sinking-fund"
                    label="Bolsillo"
                    value={selectedLinkId}
                    onChange={(value) => setSelectedLinkId(String(value))}
                    options={sinkingFunds.map((fund) => ({
                      label: `${fund.name} · ${formatCurrencyCompact(fund.monthly_contribution)}/mes`,
                      value: fund.id,
                    }))}
                    placeholder="Sin bolsillo vinculado"
                    hint={linkOptionsLoading ? 'Cargando bolsillos...' : 'Solo aparecen los bolsillos activos.'}
                  />
                ) : (
                  <SelectInput
                    name="tx-link-obligation"
                    label="Obligación recurrente"
                    value={selectedLinkId}
                    onChange={(value) => setSelectedLinkId(String(value))}
                    options={obligations.map((ob) => ({
                      label: `${ob.attributes.name} · ${formatCurrencyCompact(ob.attributes.amount)}${ob.attributes.due_day ? ` · Día ${ob.attributes.due_day}` : ''}`,
                      value: ob.id,
                    }))}
                    placeholder="Sin obligación vinculada"
                    hint={linkOptionsLoading ? 'Cargando obligaciones...' : 'Solo aparecen las obligaciones recurrentes activas.'}
                  />
                )}
              </>
            )}

            {linkingTransaction ? (
              <SelectInput
                name="tx-link-period"
                label="Mes aplicado"
                value={selectedLinkPeriod}
                onChange={(value) => setSelectedLinkPeriod(String(value))}
                options={linkPeriodOptions}
                placeholder="Selecciona mes"
                hint="Periodo financiero de esta relación."
              />
            ) : null}

            {linkError ? <p className={formStyles.error}>{linkError}</p> : null}

            <div className={formStyles.actions}>
              <Button label="Cancelar" variant="ghost" onClick={handleCloseLinkModal} />
              <Button
                label={selectedLinkId ? 'Guardar vínculo' : 'Guardar sin vínculo'}
                onClick={() => void handleSaveLink()}
                loading={linkSubmitting}
              />
            </div>
          </div>
        </section>
      </CrudModal>
    </>
  );
};

export const TransactionsPage = () => (
  <AppLayout title="Flujo">
    <TransactionsContent />
  </AppLayout>
);
