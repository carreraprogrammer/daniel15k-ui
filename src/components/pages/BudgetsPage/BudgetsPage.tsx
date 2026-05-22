import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { IonContent, IonIcon } from '@ionic/react';
import { funnelOutline, optionsOutline } from 'ionicons/icons';
import { useHistory, useParams } from 'react-router-dom';
import { AppLayout } from '../../templates/AppLayout';
import { useAppToolbar } from '../../templates/AppLayout/AppLayoutContext';
import { BreadcrumbTrail } from '../../organisms/BreadcrumbTrail';
import { Button } from '../../atoms/Button';
import { Spinner } from '../../atoms/Spinner';
import { ErrorState } from '../../molecules/ErrorState';
import { EmptyState } from '../../molecules/EmptyState';
import { ErrorNotice } from '../../molecules/ErrorNotice/ErrorNotice';
import { LoadingOverlay } from '../../molecules/LoadingOverlay/LoadingOverlay';
import { AppliedFiltersBar } from '../../molecules/AppliedFiltersBar';
import { SortSheet } from '../../molecules/SortSheet';
import { BudgetPlanModal } from '../../organisms/BudgetPlanModal/BudgetPlanModal';
import { BudgetWizardModal } from '../../organisms/BudgetWizard';
import { ActivePlanView, CategoryGroup } from '../../organisms/ActivePlanView/ActivePlanView';
import { useWizardData } from '../../../hooks/useWizardData';
import { financeService } from '../../../services/financeService';
import type {
  Budget,
  BudgetPlanDraft,
  BudgetQueryParams,
  CategoryResource,
  CurrentPlan,
  MonthlyPlanHistory,
  SummaryResponse,
  Transaction,
  FinancialPrimaryMetric,
} from '../../../types/finance.types';
import { getCategoryDisplayName, normalizeFlexibleLabel } from '../../../utils/categoryLabels';
import { buildCategoryLookup } from '../../../utils/financeBehavior';
import { formatCurrencyCompact } from '../../../utils/formatCurrency';
import styles from '../FinancePage.module.css';

const padMonth = (month: number): string => String(month).padStart(2, '0');

const parsePeriodParam = (yearParam?: string, monthParam?: string) => {
  const year = Number(yearParam);
  const month = Number(monthParam);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }

  return { year, month };
};

const formatPlanPeriod = (plan: MonthlyPlanHistory): string =>
  new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(
    new Date(plan.year, plan.month - 1, 1),
  );

const plannedExpenseTotal = (plan: MonthlyPlanHistory): number => {
  const snapshotCategories = plan.execution_snapshot?.categories;
  if (Array.isArray(snapshotCategories)) {
    return snapshotCategories.reduce((sum, category) => sum + Number(category?.budgeted ?? 0), 0);
  }
  return Number(plan.recurring_obligations_total ?? 0) +
    Number(plan.debt_minimums_total ?? 0) +
    Number(plan.discretionary_limit ?? 0);
};

const planStatusLabel = (plan: MonthlyPlanHistory): string => {
  if (plan.closed_at) return 'Cerrado';
  if (plan.status === 'draft' && plan.assumptions?.inherited_from) return 'Pendiente confirmar';
  if (plan.status === 'confirmed') return 'Confirmado';
  if (plan.status === 'draft') return 'Borrador';
  return plan.status;
};

const primaryMetricValueLabel = (metric: FinancialPrimaryMetric): string => {
  if (metric.kind === 'goal_progress' || metric.kind === 'spiky_context' || metric.kind === 'debt_progress') {
    return `${Math.round(metric.value)}%`;
  }

  return formatCurrencyCompact(metric.value);
};

// ── Types ──────────────────────────────────────────────────────────────────────

const initialFilters: BudgetQueryParams = {
  q: '',
  category_id: '',
  sort_by: 'category_id',
  sort_dir: 'asc',
};

// ── Component ──────────────────────────────────────────────────────────────────

export const BudgetsContent = () => {
  const history = useHistory();
  const routeParams = useParams<{ year?: string; month?: string }>();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [currentPlan, setCurrentPlan] = useState<CurrentPlan | null>(null);
  const [planHistory, setPlanHistory] = useState<MonthlyPlanHistory[]>([]);
  const [categories, setCategories] = useState<CategoryResource[]>([]);
  const [periodTransactions, setPeriodTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [closingPlanId, setClosingPlanId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sheet / modal state
  const [sortOpen, setSortOpen] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardIsEditMode, setWizardIsEditMode] = useState(false);
  const [wizardAdjustCategory, setWizardAdjustCategory] = useState<string | undefined>(undefined);

  // Wizard save state
  const [wizardSaving, setWizardSaving] = useState(false);
  const [wizardError, setWizardError] = useState<string | null>(null);
  const [wizardSuccess, setWizardSuccess] = useState(false);
  const [detailTab, setDetailTab] = useState<'detail' | 'history'>('detail');

  const [filters, setFilters] = useState<BudgetQueryParams>(initialFilters);

  const routePeriod = useMemo(
    () => parsePeriodParam(routeParams.year, routeParams.month),
    [routeParams.month, routeParams.year],
  );
  const currentPeriod = useMemo(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }, []);
  const selectedPeriod = routePeriod ?? currentPeriod;
  const month = `${selectedPeriod.year}-${padMonth(selectedPeriod.month)}`;
  const isHistoricalRoute = Boolean(routePeriod);

  // ── Wizard data hook ───────────────────────────────────────────────────────
  const {
    wizardData,
    loading: wizardDataLoading,
    error: wizardDataError,
    reload: reloadWizardData,
  } = useWizardData({ enabled: wizardOpen, month });

  // ── Page data load ──────────────────────────────────────────────────────────

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [budgetsResponse, summaryResponse, categoriesResponse, currentPlanResponse, monthlyPlansResponse, transactionsResponse] =
        await Promise.all([
          financeService.fetchBudgets({
            ...filters,
            month: selectedPeriod.month,
            year: selectedPeriod.year,
          }),
          financeService.fetchSummary(),
          financeService.fetchCategories(),
          financeService.fetchCurrentPlan(selectedPeriod),
          financeService.getMonthlyPlans(),
          financeService.fetchTransactions({
            month: selectedPeriod.month,
            year: selectedPeriod.year,
            per_page: 500,
            sort_by: 'date',
            sort_dir: 'desc',
          }),
        ]);
      setBudgets(budgetsResponse.data);
      setSummary(summaryResponse);
      setCurrentPlan(currentPlanResponse);
      setCategories(categoriesResponse.data);
      setPlanHistory(monthlyPlansResponse.data ?? []);
      setPeriodTransactions(transactionsResponse.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No fue posible cargar los presupuestos.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [filters, selectedPeriod.month, selectedPeriod.year]);

  useEffect(() => {
    if (isHistoricalRoute) {
      setDetailsOpen(true);
      setDetailTab('detail');
    }
  }, [isHistoricalRoute, selectedPeriod.month, selectedPeriod.year]);

  // ── Wizard completion handler ───────────────────────────────────────────────

  const handleWizardComplete = async (draft: BudgetPlanDraft) => {
    setWizardSaving(true);
    setWizardError(null);
    try {
      if (wizardIsEditMode && currentPlan) {
        // Adjusting existing plan — update lines directly, no regeneration
        await financeService.confirmMonthlyPlanWithLines(currentPlan.id, draft.lines);
      } else {
        // Creating or re-planning — generate a fresh plan then confirm it
        const plan = await financeService.generateMonthlyPlanForWizard({ mode: draft.mode });
        await financeService.confirmMonthlyPlanWithLines(plan.id, draft.lines);
      }
      setWizardOpen(false);
      setWizardSuccess(true);
      void load();
    } catch (err) {
      setWizardError(
        err instanceof Error
          ? err.message
          : 'No fue posible guardar el plan. Intentá de nuevo.',
      );
    } finally {
      setWizardSaving(false);
    }
  };

  const handleOpenWizard = () => {
    setWizardIsEditMode(false);
    setWizardError(null);
    setWizardSuccess(false);
    setWizardOpen(true);
  };

  const handleOpenWizardForEdit = (categoryCode?: string) => {
    setWizardIsEditMode(true);
    setWizardAdjustCategory(categoryCode);
    setWizardError(null);
    setWizardSuccess(false);
    setWizardOpen(true);
  };

  const handleCloseWizard = () => {
    if (wizardSaving) return; // block close while saving
    setWizardOpen(false);
    setWizardError(null);
  };

  const handleCloseMonth = async (planId: number) => {
    setClosingPlanId(planId);
    try {
      await financeService.closeMonthlyPlan(planId);
      const monthlyPlansResponse = await financeService.getMonthlyPlans();
      setPlanHistory(monthlyPlansResponse.data ?? []);
    } finally {
      setClosingPlanId(null);
    }
  };

  const handleOpenPlanDetail = (plan: MonthlyPlanHistory) => {
    setDetailTab('detail');
    setDetailsOpen(true);
    history.push(`/budgets/${plan.year}/${padMonth(plan.month)}`);
  };

  const handleCloseDetail = () => {
    setDetailsOpen(false);
    if (isHistoricalRoute) history.push('/budgets');
  };

  // ── Derived state ───────────────────────────────────────────────────────────

  const selectedCategoryId = filters.category_id ? String(filters.category_id) : '';
  const categoryFilters = useMemo(
    () =>
      categories.map((category) => ({
        id: String(category.id),
        name: getCategoryDisplayName({
          name: category.attributes.name,
          code: category.attributes.code,
          type: category.attributes.category_type,
        }),
        color: category.attributes.color ?? 'var(--color-accent)',
      })),
    [categories],
  );
  const categoryLookup = useMemo(() => buildCategoryLookup(categories), [categories]);
  const currentPlanWithCategoryColors = useMemo(() => {
    if (!currentPlan) return null;

    const colorByCode = new Map(
      categories.map((category) => [category.attributes.code ?? '', category.attributes.color ?? 'var(--color-accent)']),
    );

    return {
      ...currentPlan,
      categories: (currentPlan.categories ?? []).map((category) => ({
        ...category,
        color: category.color ?? colorByCode.get(category.code ?? '') ?? 'var(--color-accent)',
      })),
    };
  }, [categories, currentPlan]);

  const chips = useMemo(() => {
    const next = [];
    if (filters.q) next.push({ key: 'q', label: `Buscar: ${filters.q}` });
    if (filters.category_id) {
      const category = categoryFilters.find(
        (item) => item.id === String(filters.category_id),
      );
      next.push({
        key: 'category_id',
        label: `Categoría: ${category?.name ?? filters.category_id}`,
      });
    }
    return next;
  }, [categoryFilters, filters.category_id, filters.q]);
  const activeFilterCount = useMemo(
    () => chips.filter((chip) => chip.key !== 'q').length,
    [chips],
  );
  const selectedPeriodLabel = useMemo(
    () => new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(new Date(selectedPeriod.year, selectedPeriod.month - 1, 1)),
    [selectedPeriod.month, selectedPeriod.year],
  );
  const burnCategories = summary?.burn_rate?.categories ?? [];
  const outOfRange = burnCategories.filter((item) => item.on_track === false);
  const topRisk = outOfRange[0] ?? burnCategories[0] ?? null;
  const topRiskAccent = topRisk
    ? categoryFilters.find((category) => category.id === String(topRisk.category_id))?.color ?? 'var(--color-accent)'
    : 'var(--color-accent)';
  const toolbar = useMemo(
    () => (
      detailsOpen
        ? {
            title: detailTab === 'history' ? 'Historial' : 'Plan del mes',
            subtitle: selectedPeriodLabel,
            searchPlaceholder: !currentPlan && detailTab === 'detail' ? 'Categoría' : undefined,
            searchValue: !currentPlan && detailTab === 'detail' ? (filters.q ?? '') : undefined,
            resultLabel: !currentPlan && detailTab === 'detail' ? `${budgets.length} resultados` : undefined,
            onSearchChange: !currentPlan && detailTab === 'detail'
              ? (q: string) => setFilters((current) => ({ ...current, q }))
              : undefined,
            actions: !currentPlan && detailTab === 'detail'
              ? [
                  {
                    key: 'sort',
                    label: 'Ordenar',
                    icon: <IonIcon icon={optionsOutline} />,
                    onClick: () => setSortOpen(true),
                  },
                  {
                    key: 'filters',
                    label: 'Filtrar',
                    icon: <IonIcon icon={funnelOutline} />,
                    onClick: () => setFiltersVisible((visible) => !visible),
                    badgeCount: activeFilterCount,
                    active: filtersVisible,
                  },
                ]
              : [],
          }
        : null
    ),
    [activeFilterCount, budgets.length, currentPlan, detailTab, detailsOpen, filters.q, filtersVisible, selectedPeriodLabel],
  );

  useAppToolbar(toolbar);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <IonContent className={styles.pageContent}>
        <section className={`${styles.stack} ${currentPlan || !detailsOpen ? styles.stackFill : ''}`}>

          {/* ── Active plan view (shown when there is a confirmed plan) ── */}
          {!loading && !error && ((currentPlan && !detailsOpen) || (!currentPlan && !detailsOpen)) ? (
            <div className={styles.focusStage}>
              {currentPlanWithCategoryColors ? (
                <div className={styles.budgetHeroSurface}>
                  <ActivePlanView
                    currentPlan={currentPlanWithCategoryColors}
                    onEditPlan={handleOpenWizardForEdit}
                    onExploreDetail={() => setDetailsOpen(true)}
                  />

                  {wizardSuccess && (
                    <div className={styles.budgetToast}>
                      Plan guardado correctamente para {month}.
                    </div>
                  )}
                </div>
              ) : (
                <div className={`${styles.focusCard} ${styles.focusCardFull} ${styles.focusCardCentered}`}>
                  {/* Burn-rate focus card (pre-plan state) */}
                  {!detailsOpen ? (
                    <div className={styles.focusGrid}>
                      <div className={styles.focusCopy}>
                        <span className={styles.eyebrow}>Presupuestos</span>
                        <p className={styles.focusQuestion}>
                          ¿El mes va dentro del plan o ya se salió de rango?
                        </p>
                        <h2 className={styles.focusTitle}>
                          {outOfRange.length
                            ? `${outOfRange.length} categorías fuera de rango`
                            : 'El burn rate sigue estable'}
                        </h2>
                        <p className={styles.focusText}>
                          {topRisk
                            ? `${topRisk.category} es la señal más útil para empezar. No necesitas leer toda la tabla antes de saber dónde mirar.`
                            : 'Armá el plan mensual para que esta tarjeta muestre si el presupuesto sigue en rango.'}
                        </p>
                      </div>
                      <div>
                        <div className={styles.focusValue}>
                          {topRisk?.primary_metric
                            ? primaryMetricValueLabel(topRisk.primary_metric)
                            : topRisk
                              ? formatCurrencyCompact(topRisk.projected)
                              : '—'}
                        </div>
                        <p className={styles.focusCaption}>
                          {topRisk?.primary_metric
                            ? topRisk.primary_metric.title
                            : topRisk
                              ? `Proyección actual de ${topRisk.category}`
                            : 'Sin burn rate visible todavía'}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {topRisk && !detailsOpen ? (
                    <section
                      className={styles.focusSupport}
                      style={{ '--category-accent': topRiskAccent } as CSSProperties}
                    >
                      <div className={styles.focusSupportHeader}>
                        <h3 className={styles.focusSupportTitle}>Riesgo principal</h3>
                        <span className={styles.focusSupportValue}>{Math.round(topRisk.pct)}%</span>
                      </div>
                      <div
                        className={styles.focusRail}
                        role="progressbar"
                        aria-valuenow={Math.min(Math.round(topRisk.pct), 100)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${topRisk.category}: ${Math.round(topRisk.pct)}% del presupuesto`}
                      >
                        <div
                          className={`${styles.focusRailFill} ${topRisk.on_track ? '' : styles.focusRailFillWarn}`}
                          style={{ width: `${Math.min(Math.round(topRisk.pct), 100)}%` }}
                        />
                      </div>
                      <p className={styles.focusSupportText}>
                        {topRisk.primary_metric?.body ??
                          `${formatCurrencyCompact(topRisk.spent)} gastados de ${formatCurrencyCompact(topRisk.budget)}; proyectado a ${formatCurrencyCompact(topRisk.projected)}.`}
                      </p>
                    </section>
                  ) : null}

                  {!detailsOpen ? (
                    <>
                      <div className={styles.focusMeta}>
                        <span className={styles.focusBadge}>
                          {budgets.length} categorías con presupuesto
                        </span>
                        <span className={styles.focusBadge}>{outOfRange.length} alertas</span>
                      </div>

                      <div className={styles.focusActions}>
                        <Button label="Armar plan mensual" onClick={handleOpenWizard} />
                        <Button
                          label="Plan anterior"
                          variant="ghost"
                          onClick={() => setPlanModalOpen(true)}
                        />
                        <Button
                          label="Explorar detalle"
                          variant="ghost"
                          onClick={() => setDetailsOpen(true)}
                        />
                      </div>
                    </>
                  ) : null}
                </div>
              )}
            </div>
          ) : null}

          {/* ── Detail view with tabs ── */}
          {detailsOpen ? (
            <div className={styles.detailStage}>
              <BreadcrumbTrail items={[
                { label: 'Presupuestos', onClick: handleCloseDetail },
                { label: detailTab === 'history' ? 'Historial' : 'Detalle' },
              ]} />
              <div className={styles.detailStageHeader}>
                <div className={styles.detailTabBar}>
                  <button
                    type="button"
                    className={`${styles.detailTabBtn} ${detailTab === 'detail' ? styles.detailTabBtnActive : ''}`}
                    onClick={() => setDetailTab('detail')}
                  >
                    Detalle
                  </button>
                  <button
                    type="button"
                    className={`${styles.detailTabBtn} ${detailTab === 'history' ? styles.detailTabBtnActive : ''}`}
                    onClick={() => setDetailTab('history')}
                  >
                    Historial
                  </button>
                </div>
              </div>

              {/* ── Tab: Detalle ── */}
              {detailTab === 'detail' ? (
                <>
                  {currentPlanWithCategoryColors && Array.isArray(currentPlanWithCategoryColors.categories) && currentPlanWithCategoryColors.categories.length > 0 ? (
                    <div className={styles.detailPanel}>
                      {currentPlanWithCategoryColors.categories.map((cat) => (
                        <CategoryGroup
                          key={cat.code ?? cat.name ?? 'unknown'}
                          category={cat}
                          transactions={periodTransactions}
                          categoryLookup={categoryLookup}
                          onAdjust={(code) => {
                            setDetailsOpen(false);
                            handleOpenWizardForEdit(code);
                          }}
                        />
                      ))}
                    </div>
                  ) : null}

                  {!currentPlan ? (
                    <div className={styles.detailPanel}>
                      {filtersVisible ? (
                        <div className={styles.filterPanel}>
                          <section className={styles.filterComposer}>
                            <div className={styles.filterComposerHeader}>
                              <span className={styles.filterComposerLabel}>Categoría</span>
                              <span className={styles.filterComposerHint}>Filtra el plan por la categoría que quieres revisar.</span>
                            </div>
                            <div className={styles.categoryRail}>
                              {categoryFilters.map((category) => {
                                const active = category.id === selectedCategoryId;
                                return (
                                  <button
                                    key={category.id}
                                    type="button"
                                    className={[styles.categoryToken, active ? styles.categoryTokenActive : ''].filter(Boolean).join(' ')}
                                    style={{ '--category-accent': category.color } as CSSProperties}
                                    onClick={() => setFilters((f) => ({ ...f, category_id: active ? '' : category.id }))}
                                  >
                                    <span className={styles.categorySwatch} />
                                    <span className={styles.categoryTokenText}>{category.name}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </section>
                        </div>
                      ) : null}
                      <AppliedFiltersBar
                        chips={chips}
                        onRemove={(key) => setFilters((f) => ({ ...f, [key]: '' }))}
                        onClearAll={() => setFilters(initialFilters)}
                      />
                    </div>
                  ) : null}

                  {!currentPlan ? (
                    <>
                      {loading ? <div className={styles.centeredState}><Spinner size="lg" /></div> : null}
                      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
                      {!loading && !error && !budgets.length ? (
                        <EmptyState message="No hay presupuestos definidos para el período actual." />
                      ) : null}
                      {!loading && !error && budgets.length ? (
                        <div className={styles.list}>
                          {budgets.map((budget) => {
                            const burnRate = summary?.burn_rate?.categories.find(
                              (item) => item.category_id === budget.attributes.category_id,
                            );
                            const onTrack = burnRate?.on_track !== false;
                            return (
                              <div key={budget.id} className={styles.listItem}>
                                <div className={styles.listPrimary}>
                                  <span className={styles.listLabel}>
                                    {normalizeFlexibleLabel(budget.attributes.category_name) || `Categoría ${budget.attributes.category_id}`}
                                  </span>
                                  <span className={styles.listMeta}>
                                    Límite {formatCurrencyCompact(budget.attributes.amount_limit)}
                                    {burnRate ? ` · Gasto ${formatCurrencyCompact(burnRate.spent)}` : ''}
                                  </span>
                                </div>
                                <div className={styles.listSecondary}>
                                  <span className={onTrack ? styles.statusGood : styles.statusWarn}>
                                    {onTrack ? 'En rango' : 'Fuera de rango'}
                                  </span>
                                  {burnRate ? (
                                    <span className={styles.listMeta}>
                                      {burnRate.primary_metric?.title ?? 'Proyectado'}{' '}
                                      {burnRate.primary_metric
                                        ? primaryMetricValueLabel(burnRate.primary_metric)
                                        : formatCurrencyCompact(burnRate.projected)}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </>
              ) : null}

              {/* ── Tab: Historial ── */}
              {detailTab === 'history' ? (
                <section className={styles.panel}>
                  {planHistory.length ? (
                    <div className={styles.list}>
                      {planHistory.map((plan) => {
                        const plannedIncome = Number(plan.base_budget_income ?? 0) + Number(plan.expected_variable_income ?? 0);
                        const actualIncome = Number(plan.execution_snapshot?.income_actual ?? plan.income_actual ?? 0);
                        const plannedExpense = plannedExpenseTotal(plan);
                        const actualExpense = Number(plan.execution_snapshot?.expense_actual ?? plan.expense_actual ?? 0);
                        const closed = Boolean(plan.closed_at);
                        const pendingInherited = plan.status === 'draft' && Boolean(plan.assumptions?.inherited_from);

                        return (
                          <article
                            key={plan.id}
                            className={`${styles.historyItem} ${routePeriod?.year === plan.year && routePeriod?.month === plan.month ? styles.historyItemActive : ''}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => handleOpenPlanDetail(plan)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                handleOpenPlanDetail(plan);
                              }
                            }}
                            aria-label={`Ver detalle de ${formatPlanPeriod(plan)}`}
                          >
                            <div className={styles.historyPrimary}>
                              <div className={styles.historyTitleRow}>
                                <span className={styles.historyPeriod}>{formatPlanPeriod(plan)}</span>
                                {pendingInherited ? <span className={styles.historyNote}>Heredado</span> : null}
                              </div>
                              <div className={styles.historyMetrics}>
                                <span className={styles.historyMetric}>
                                  <span>Ingreso planeado</span>
                                  <strong>{formatCurrencyCompact(plannedIncome)}</strong>
                                  {closed ? <small>Real {formatCurrencyCompact(actualIncome)}</small> : null}
                                </span>
                                <span className={styles.historyMetric}>
                                  <span>Gasto planeado</span>
                                  <strong>{formatCurrencyCompact(plannedExpense)}</strong>
                                  {closed ? <small>Real {formatCurrencyCompact(actualExpense)}</small> : null}
                                </span>
                              </div>
                            </div>
                            <div className={styles.historyActions}>
                              <span className={styles.historyStatus}>{planStatusLabel(plan)}</span>
                              {plan.status === 'confirmed' && !plan.closed_at ? (
                                <span onClick={(event) => event.stopPropagation()}>
                                  <Button
                                    label={closingPlanId === plan.id ? 'Cerrando…' : 'Cerrar mes'}
                                    variant="ghost"
                                    size="sm"
                                    disabled={closingPlanId === plan.id}
                                    onClick={() => void handleCloseMonth(plan.id)}
                                  />
                                </span>
                              ) : null}
                              <span className={styles.historyDetailHint}>Ver detalle</span>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyState message="Todavía no hay planes mensuales en el historial." />
                  )}
                </section>
              ) : null}
            </div>
          ) : null}
        </section>

        {/* ── Budget Wizard Modal ── */}
        <BudgetWizardModal
          isOpen={wizardOpen}
          onClose={handleCloseWizard}
          onComplete={(draft: BudgetPlanDraft) => void handleWizardComplete(draft)}
          wizardData={wizardData ?? undefined}
          month={month}
          hasPlanHistory={planHistory.length > 0}
          isEditMode={wizardIsEditMode}
          adjustCategoryCode={wizardAdjustCategory}
          existingMode={currentPlan?.mode}
        />

        {/* Loading overlay shown inside wizard when fetching wizard data */}
        <LoadingOverlay
          isOpen={wizardOpen && wizardDataLoading && !wizardData}
          message="Cargando datos del asistente..."
        />

        {/* Wizard-level error (fetch failure) */}
        {wizardOpen && wizardDataError && !wizardData ? (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              padding: 'var(--space-6)',
              background: 'rgba(5, 7, 12, 0.72)',
              zIndex: 'calc(var(--z-modal) + 1)',
            }}
          >
            <ErrorNotice
              title="No pudimos abrir el asistente"
              message={wizardDataError}
              onRetry={reloadWizardData}
              secondaryAction={<Button label="Cerrar" variant="ghost" onClick={handleCloseWizard} />}
            />
          </div>
        ) : null}

        {/* Wizard save error (generate/confirm failure) — shown while wizard stays open */}
        {wizardOpen && wizardError ? (
          <div
            role="alert"
            style={{
              position: 'fixed',
              bottom: 'calc(var(--space-8) + env(safe-area-inset-bottom))',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: 'var(--space-3) var(--space-5)',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--color-error-subtle)',
              border: '1px solid var(--color-error)',
              color: 'var(--color-error)',
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-sm)',
              zIndex: 'calc(var(--z-modal) + 2)',
              maxWidth: 'min(480px, 90vw)',
              textAlign: 'center',
            }}
          >
            {wizardError}
          </div>
        ) : null}

        {/* Wizard saving overlay */}
        <LoadingOverlay
          isOpen={wizardSaving}
          message="Guardando plan..."
          zIndex="calc(var(--z-modal) + 3)"
        />

        {/* Legacy BudgetPlanModal — kept for backward compatibility */}
        <BudgetPlanModal
          isOpen={planModalOpen}
          onClose={() => setPlanModalOpen(false)}
          onSaved={() => void load()}
        />

        <SortSheet
          isOpen={sortOpen}
          title="Ordenar presupuestos"
          sortBy={String(filters.sort_by ?? 'category_id')}
          sortDir={(filters.sort_dir as 'asc' | 'desc') ?? 'asc'}
          options={[
            { label: 'Categoría', value: 'category_name' },
            { label: 'Límite', value: 'amount_limit' },
            { label: 'ID categoría', value: 'category_id' },
          ]}
          onClose={() => setSortOpen(false)}
          onChangeSortBy={(sort_by) => setFilters((current) => ({ ...current, sort_by }))}
          onChangeSortDir={(sort_dir) => setFilters((current) => ({ ...current, sort_dir }))}
        />

    </IonContent>
  );
};

export const BudgetsPage = () => (
  <AppLayout title="Presupuestos">
    <BudgetsContent />
  </AppLayout>
);
