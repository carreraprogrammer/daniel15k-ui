import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { IonContent } from '@ionic/react';
import { AppLayout } from '../../templates/AppLayout';
import { Button } from '../../atoms/Button';
import { Spinner } from '../../atoms/Spinner';
import { ErrorState } from '../../molecules/ErrorState';
import { EmptyState } from '../../molecules/EmptyState';
import { ListToolbar } from '../../molecules/ListToolbar';
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
  SummaryResponse,
} from '../../../types/finance.types';
import styles from '../FinancePage.module.css';

// ── Helpers ────────────────────────────────────────────────────────────────────

const formatCop = (value: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);

/** Derive the current month string, e.g. "2026-05" */
const currentMonthString = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

// ── Types ──────────────────────────────────────────────────────────────────────

const initialFilters: BudgetQueryParams = {
  q: '',
  category_id: '',
  sort_by: 'category_id',
  sort_dir: 'asc',
};

// ── Component ──────────────────────────────────────────────────────────────────

export const BudgetsPage = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [currentPlan, setCurrentPlan] = useState<CurrentPlan | null>(null);
  const [categories, setCategories] = useState<CategoryResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sheet / modal state
  const [sortOpen, setSortOpen] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);

  // Wizard save state
  const [wizardSaving, setWizardSaving] = useState(false);
  const [wizardError, setWizardError] = useState<string | null>(null);
  const [wizardSuccess, setWizardSuccess] = useState(false);

  const [filters, setFilters] = useState<BudgetQueryParams>(initialFilters);

  const month = currentMonthString();

  // ── Wizard data hook ────────────────────────────────────────────────────────
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
      const [budgetsResponse, summaryResponse, categoriesResponse, currentPlanResponse] =
        await Promise.all([
          financeService.fetchBudgets(filters),
          financeService.fetchSummary(),
          financeService.fetchCategories(),
          financeService.fetchCurrentPlan(),
        ]);
      setBudgets(budgetsResponse.data);
      setSummary(summaryResponse);
      setCurrentPlan(currentPlanResponse);
      setCategories(categoriesResponse.data);
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
  }, [filters]);

  // ── Wizard completion handler ───────────────────────────────────────────────

  const handleWizardComplete = async (draft: BudgetPlanDraft) => {
    setWizardSaving(true);
    setWizardError(null);
    try {
      const plan = await financeService.generateMonthlyPlanForWizard({ mode: 'conservative' });
      await financeService.confirmMonthlyPlanWithLines(plan.id, draft.lines);
      setWizardOpen(false);
      setWizardSuccess(true);
      // Reload page data so ActivePlanView and burn-rate card reflect the new plan
      void load();
    } catch (err) {
      setWizardError(
        err instanceof Error
          ? err.message
          : 'No fue posible guardar el plan. Intentá de nuevo.',
      );
      // Keep wizard open so the user can retry
    } finally {
      setWizardSaving(false);
    }
  };

  const handleOpenWizard = () => {
    setWizardError(null);
    setWizardSuccess(false);
    setWizardOpen(true);
  };

  const handleCloseWizard = () => {
    if (wizardSaving) return; // block close while saving
    setWizardOpen(false);
    setWizardError(null);
  };

  // ── Derived state ───────────────────────────────────────────────────────────

  const selectedCategoryId = filters.category_id ? String(filters.category_id) : '';
  const categoryFilters = useMemo(
    () =>
      categories.map((category) => ({
        id: String(category.id),
        name: category.attributes.name ?? 'Sin categoría',
        color: category.attributes.color ?? 'var(--color-accent)',
      })),
    [categories],
  );

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

  const burnCategories = summary?.burn_rate?.categories ?? [];
  const outOfRange = burnCategories.filter((item) => item.on_track === false);
  const topRisk = outOfRange[0] ?? burnCategories[0] ?? null;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <AppLayout title="Presupuestos">
      <IonContent className={styles.pageContent}>
        <section className={`${styles.stack} ${currentPlan || !detailsOpen ? styles.stackFill : ''}`}>

          {/* ── Active plan view (shown when there is a confirmed plan) ── */}
          {!loading && !error && ((currentPlan && !detailsOpen) || (!currentPlan && !detailsOpen)) ? (
            <div className={styles.focusStage}>
              <div className={`${styles.focusCard} ${styles.focusCardFull} ${styles.focusCardCentered}`}>
                {currentPlan ? (
                  <ActivePlanView
                    currentPlan={currentPlan}
                    onEditPlan={handleOpenWizard}
                    onExploreDetail={() => setDetailsOpen(true)}
                  />
                ) : (
                  <>
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
                            : 'Cuando existan presupuestos, esta tarjeta te dirá primero si el plan sigue sano o no.'}
                        </p>
                      </div>
                      <div>
                        <div className={styles.focusValue}>
                          {topRisk ? formatCop(topRisk.projected) : '—'}
                        </div>
                        <p className={styles.focusCaption}>
                          {topRisk
                            ? `Proyección actual de ${topRisk.category}`
                            : 'Sin burn rate visible todavía'}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {topRisk && !detailsOpen ? (
                    <section className={styles.focusSupport}>
                      <div className={styles.focusSupportHeader}>
                        <h3 className={styles.focusSupportTitle}>Riesgo principal</h3>
                        <span className={styles.focusSupportValue}>{Math.round(topRisk.pct)}%</span>
                      </div>
                      <div className={styles.focusRail}>
                        <div
                          className={`${styles.focusRailFill} ${topRisk.on_track ? '' : styles.focusRailFillWarn}`}
                          style={{ width: `${Math.min(Math.round(topRisk.pct), 100)}%` }}
                        />
                      </div>
                      <p className={styles.focusSupportText}>
                        {formatCop(topRisk.spent)} gastados de {formatCop(topRisk.budget)};
                        proyectado a {formatCop(topRisk.projected)}.
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
                  </>
                )}

                {/* Success banner */}
                {wizardSuccess && (
                  <div style={{
                    marginTop: 'var(--space-4)',
                    padding: 'var(--space-3) var(--space-4)',
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--color-success-subtle)',
                    color: 'var(--color-success)',
                    fontSize: 'var(--text-sm)',
                    fontFamily: 'var(--font-sans)',
                  }}>
                    Plan guardado correctamente para {month}.
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* ── Detail view ── */}
          {detailsOpen ? (
            <div className={styles.detailStage}>
              <div className={styles.detailStageHeader}>
                <div className={styles.detailStageCopy}>
                  <h3 className={styles.detailStageTitle}>Detalle del plan</h3>
                  <p className={styles.detailStageText}>
                    Seguimiento por categoría: gastado, presupuestado y proyección del mes.
                  </p>
                </div>
                <Button label="← Volver" variant="ghost" onClick={() => setDetailsOpen(false)} />
              </div>

              {/* Category breakdown from current plan */}
              {currentPlan && Array.isArray(currentPlan.categories) && currentPlan.categories.length > 0 ? (
                <div className={styles.detailPanel}>
                  {currentPlan.categories.map((cat, index) => (
                    <CategoryGroup
                      key={cat.code ?? cat.name ?? 'unknown'}
                      category={cat}
                      defaultExpanded={index === 0}
                    />
                  ))}
                </div>
              ) : null}
              {!currentPlan ? <div className={styles.detailPanel}>
                <ListToolbar
                  searchLabel="Buscar presupuestos"
                  searchPlaceholder="Categoría"
                  searchValue={filters.q ?? ''}
                  resultLabel={`${budgets.length} resultados`}
                  activeFilterCount={activeFilterCount}
                  onSearchChange={(q) => {
                    const next = { ...filters, q };
                    setFilters(next);
                  }}
                  onOpenSort={() => setSortOpen(true)}
                  onOpenFilters={() => setFiltersVisible((visible) => !visible)}
                />

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
                              onClick={() =>
                                setFilters((current) => ({
                                  ...current,
                                  category_id: active ? '' : category.id,
                                }))
                              }
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
                  onRemove={(key) => {
                    const next = { ...filters, [key]: '' };
                    setFilters(next);
                  }}
                  onClearAll={() => {
                    setFilters(initialFilters);
                  }}
                />
              </div> : null}
            </div>
          ) : null}

          {detailsOpen && !currentPlan ? (
            <>
              {loading ? <Spinner size="lg" /> : null}
              {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
              {!loading && !error && !budgets.length ? (
                <EmptyState message="No hay presupuestos definidos para el período actual." />
              ) : null}

              {!loading && !error && budgets.length ? (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Categoría</th>
                        <th className={styles.numeric}>Límite</th>
                        <th className={styles.numeric}>Gastado</th>
                        <th className={styles.numeric}>Proyectado</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {budgets.map((budget) => {
                        const burnRate = summary?.burn_rate?.categories.find(
                          (item) => item.category_id === budget.attributes.category_id,
                        );
                        return (
                          <tr key={budget.id}>
                            <td>
                              {budget.attributes.category_name ??
                                `Categoría ${budget.attributes.category_id}`}
                            </td>
                            <td className={styles.numeric}>
                              {formatCop(budget.attributes.amount_limit)}
                            </td>
                            <td className={styles.numeric}>{formatCop(burnRate?.spent ?? 0)}</td>
                            <td className={styles.numeric}>
                              {formatCop(burnRate?.projected ?? 0)}
                            </td>
                            <td
                              className={
                                burnRate?.on_track === false ? styles.statusWarn : styles.statusGood
                              }
                            >
                              {burnRate?.on_track === false ? 'Fuera de rango' : 'En rango'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </>
          ) : null}
        </section>

        {/* ── Budget Wizard Modal ── */}
        <BudgetWizardModal
          isOpen={wizardOpen}
          onClose={handleCloseWizard}
          onComplete={(draft: BudgetPlanDraft) => void handleWizardComplete(draft)}
          wizardData={wizardData ?? undefined}
          month={month}
        />

        {/* Loading overlay shown inside wizard when fetching wizard data */}
        {wizardOpen && wizardDataLoading && !wizardData ? (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-4)',
              background: 'rgba(5, 7, 12, 0.72)',
              zIndex: 'calc(var(--z-modal) + 1)',
            }}
          >
            <Spinner size="lg" />
            <p
              style={{
                margin: 0,
                color: 'var(--color-text-secondary)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-sm)',
              }}
            >
              Cargando datos del asistente...
            </p>
          </div>
        ) : null}

        {/* Wizard-level error (fetch failure) */}
        {wizardOpen && wizardDataError && !wizardData ? (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-4)',
              background: 'rgba(5, 7, 12, 0.72)',
              zIndex: 'calc(var(--z-modal) + 1)',
            }}
          >
            <p
              style={{
                margin: 0,
                color: 'var(--color-error)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-sm)',
              }}
            >
              {wizardDataError}
            </p>
            <Button label="Reintentar" onClick={reloadWizardData} />
            <Button label="Cerrar" variant="ghost" onClick={handleCloseWizard} />
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
        {wizardSaving ? (
          <div
            aria-busy="true"
            style={{
              position: 'fixed',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-4)',
              background: 'rgba(5, 7, 12, 0.72)',
              zIndex: 'calc(var(--z-modal) + 3)',
            }}
          >
            <Spinner size="lg" />
            <p
              style={{
                margin: 0,
                color: 'var(--color-text-secondary)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-sm)',
              }}
            >
              Guardando plan...
            </p>
          </div>
        ) : null}

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
    </AppLayout>
  );
};
