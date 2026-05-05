import { useEffect, useMemo, useState } from 'react';
import { IonContent, IonIcon } from '@ionic/react';
import { addOutline, chevronBackOutline } from 'ionicons/icons';
import { AppLayout, useAppBreadcrumbs } from '../../templates/AppLayout';
import { Button } from '../../atoms/Button';
import { Spinner } from '../../atoms/Spinner';
import { SelectInput } from '../../atoms/SelectInput';
import { ErrorState } from '../../molecules/ErrorState';
import { EmptyState } from '../../molecules/EmptyState';
import { CrudModal } from '../../molecules/CrudModal';
import { ListToolbar } from '../../molecules/ListToolbar';
import { AppliedFiltersBar } from '../../molecules/AppliedFiltersBar';
import { SortSheet } from '../../molecules/SortSheet';
import { PlannedExpenseComposer } from '../../organisms/PlannedExpenseComposer';
import { PlannedExpenseSlidingCard } from '../../organisms/PlannedExpenseSlidingCard';
import { useToast } from '../../../hooks/useToast';
import { financeService } from '../../../services/financeService';
import { formatCurrencyCompact } from '../../../utils/formatCurrency';
import type {
  CategoryResource,
  PlannedExpense,
  PlannedExpensePayload,
  PlannedExpenseQueryParams,
  SinkingFund,
} from '../../../types/finance.types';
import styles from '../FinancePage.module.css';

const planningTypeLabels: Record<string, string> = {
  mandatory_one_off: 'Obligatorio puntual',
  irregular_maintenance: 'Mantenimiento',
  wish: 'Deseo',
  planned_purchase: 'Compra planeada',
};

const initialFilters: PlannedExpenseQueryParams = {
  q: '',
  status: '',
  planning_type: '',
  category_id: '',
  sort_by: 'target_date',
  sort_dir: 'asc',
};

type DetailTab = 'planned' | 'pockets';

const formatDate = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`))
    : 'Sin fecha objetivo';

export const PlannedExpensesContent = () => {
  const [plannedExpenses, setPlannedExpenses] = useState<PlannedExpense[]>([]);
  const [sinkingFunds, setSinkingFunds] = useState<SinkingFund[]>([]);
  const [categories, setCategories] = useState<CategoryResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState<PlannedExpense | null>(null);
  const [filters, setFilters] = useState<PlannedExpenseQueryParams>(initialFilters);
  const [activeTab, setActiveTab] = useState<DetailTab>('planned');
  const { showError, showSuccess, toast } = useToast();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [expensesResponse, categoriesResponse, fundsResponse] = await Promise.all([
        financeService.fetchPlannedExpenses(filters),
        financeService.fetchCategories(),
        financeService.getSinkingFunds(),
      ]);
      setPlannedExpenses(expensesResponse.data);
      setCategories(categoriesResponse.data);
      setSinkingFunds(fundsResponse);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'No fue posible cargar los gastos planeados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [filters]);

  const metrics = useMemo(() => {
    const pending = plannedExpenses.filter((expense) => expense.attributes.status === 'planned');
    const activeFunds = sinkingFunds.filter((fund) => fund.active);
    return {
      totalEstimated: pending.reduce((sum, expense) => sum + expense.attributes.amount_estimated, 0),
      plannedCount: pending.length,
      totalCount: plannedExpenses.length,
      fundCount: activeFunds.length,
      fundBalance: activeFunds.reduce((sum, fund) => sum + fund.current_balance, 0),
      fundMonthly: activeFunds.reduce((sum, fund) => sum + fund.monthly_contribution, 0),
    };
  }, [plannedExpenses, sinkingFunds]);

  const categoryOptions = useMemo(
    () =>
      categories.map((category) => ({
        label: category.attributes.name ?? 'Sin categoría',
        value: String(category.id),
      })),
    [categories],
  );

  const plannedById = useMemo(() => {
    const entries = plannedExpenses.map((expense) => [Number(expense.id), expense] as const);
    return new Map(entries);
  }, [plannedExpenses]);

  const handleCreate = async (payload: PlannedExpensePayload) => {
    setSubmitting(true);
    try {
      await financeService.createPlannedExpense(payload);
      setComposerOpen(false);
      await load();
      showSuccess('Gasto planeado guardado.');
    } catch (nextError) {
      showError(nextError instanceof Error ? nextError.message : 'No fue posible guardar el gasto planeado.');
      throw nextError;
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (id: string, payload: Partial<PlannedExpensePayload>) => {
    setSubmitting(true);
    try {
      await financeService.updatePlannedExpense(id, payload);
      setEditingExpense(null);
      setComposerOpen(false);
      await load();
      showSuccess('Gasto planeado actualizado.');
    } catch (nextError) {
      showError(nextError instanceof Error ? nextError.message : 'No fue posible actualizar el gasto planeado.');
      throw nextError;
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangeStatus = async (plannedExpense: PlannedExpense, status: PlannedExpense['attributes']['status']) => {
    await handleUpdate(plannedExpense.id, { status });
  };

  const appliedChips = useMemo(() => {
    const chips = [];
    if (filters.q) chips.push({ key: 'q', label: `Buscar: ${filters.q}` });
    if (filters.status) chips.push({ key: 'status', label: `Estado: ${filters.status}` });
    if (filters.planning_type) {
      chips.push({ key: 'planning_type', label: `Tipo: ${planningTypeLabels[filters.planning_type] ?? filters.planning_type}` });
    }
    if (filters.category_id) {
      const category = categoryOptions.find((option) => option.value === String(filters.category_id));
      chips.push({ key: 'category_id', label: `Categoría: ${category?.label ?? filters.category_id}` });
    }
    return chips;
  }, [categoryOptions, filters.category_id, filters.planning_type, filters.q, filters.status]);

  const activeFilterCount = useMemo(
    () => appliedChips.filter((chip) => chip.key !== 'q').length,
    [appliedChips],
  );
  const detailBreadcrumbs = useMemo(
    () => (detailsOpen ? [
      { label: 'Planeados', onClick: () => setDetailsOpen(false) },
      { label: activeTab === 'pockets' ? 'Bolsillos' : 'Detalle' },
    ] : []),
    [activeTab, detailsOpen],
  );
  useAppBreadcrumbs(detailBreadcrumbs);

  const removeChip = (key: string) => {
    setFilters((current) => ({ ...current, [key]: '' }));
  };

  return (
    <IonContent className={styles.pageContent}>
        <section className={`${styles.stack} ${!detailsOpen ? styles.stackFill : ''}`}>
          {!detailsOpen ? (
            <div className={styles.focusStage}>
              <div className={`${styles.focusCard} ${styles.focusCardFull} ${styles.focusCardCentered}`}>
                <div className={styles.focusGrid}>
                  <div className={styles.focusCopy}>
                    <span className={styles.eyebrow}>Planeación futura</span>
                    <p className={styles.focusQuestion}>¿Qué gasto previsible viene adelante y todavía no debería entrar como transacción?</p>
                    <h2 className={styles.focusTitle}>
                      {metrics.plannedCount ? `${metrics.plannedCount} gastos pendientes` : 'No hay gastos pendientes'}
                    </h2>
                    <p className={styles.focusText}>
                      Esta vista concentra compras planeadas, mantenimientos y gastos puntuales futuros sin mezclarlos con flujo mensual ni con transacciones reales.
                    </p>
                  </div>
                  <div>
                    <div className={styles.focusValue}>{formatCurrencyCompact(metrics.totalEstimated)}</div>
                    <p className={styles.focusCaption}>Monto estimado pendiente</p>
                  </div>
                </div>

                <div className={styles.focusMeta}>
                  <span className={styles.focusBadge}>{metrics.totalCount} registrados</span>
                  <span className={styles.focusBadge}>{metrics.plannedCount} siguen abiertos</span>
                  <span className={styles.focusBadge}>{metrics.fundCount} bolsillos activos</span>
                </div>

                <div className={styles.focusActions}>
                  <Button
                    label="Nuevo gasto planeado"
                    variant="primary"
                    iconLeft={<IonIcon icon={addOutline} />}
                    onClick={() => {
                      setEditingExpense(null);
                      setComposerOpen(true);
                    }}
                  />
                  <Button label="Explorar detalle" variant="ghost" onClick={() => setDetailsOpen(true)} />
                </div>
              </div>
            </div>
          ) : null}

          {detailsOpen ? (
            <div className={styles.detailStage}>
              <div className={styles.detailStageHeader}>
                <button
                  type="button"
                  className={styles.detailBackBtn}
                  onClick={() => setDetailsOpen(false)}
                >
                  <IonIcon icon={chevronBackOutline} aria-hidden="true" />
                  Planes
                </button>
                <div className={styles.detailStageCopy}>
                  <h3 className={styles.detailStageTitle}>Detalle de planeados</h3>
                  <p className={styles.detailStageText}>Aquí viven los gastos futuros y los bolsillos que los fondean mes a mes.</p>
                </div>
                <div className={styles.detailHeaderActions}>
                  <div className={styles.detailTabBar} role="tablist" aria-label="Vista de planeados">
                    <button
                      type="button"
                      className={`${styles.detailTabBtn} ${activeTab === 'planned' ? styles.detailTabBtnActive : ''}`}
                      onClick={() => setActiveTab('planned')}
                    >
                      Planeados
                    </button>
                    <button
                      type="button"
                      className={`${styles.detailTabBtn} ${activeTab === 'pockets' ? styles.detailTabBtnActive : ''}`}
                      onClick={() => setActiveTab('pockets')}
                    >
                      Bolsillos
                    </button>
                  </div>
                </div>
              </div>
              {activeTab === 'planned' ? (
                <div className={styles.detailPanel}>
                  <ListToolbar
                    searchLabel="Buscar gastos planeados"
                    searchPlaceholder="SOAT, viaje, mantenimiento"
                    searchValue={filters.q ?? ''}
                    resultLabel={`${plannedExpenses.length} resultados`}
                    activeFilterCount={activeFilterCount}
                    onSearchChange={(q) => setFilters((current) => ({ ...current, q }))}
                    onOpenSort={() => setSortOpen(true)}
                    onOpenFilters={() => setFiltersVisible((visible) => !visible)}
                  />

                  {filtersVisible ? (
                    <div className={styles.filterPanel}>
                      <div className={styles.inlineFilters}>
                        <SelectInput
                          name="planned-expenses-status"
                          value={filters.status ?? ''}
                          onChange={(status) => setFilters((current) => ({ ...current, status: String(status) }))}
                          options={[
                            { label: 'Planeado', value: 'planned' },
                            { label: 'Ejecutado', value: 'executed' },
                            { label: 'Cancelado', value: 'cancelled' },
                          ]}
                          placeholder="Todos los estados"
                        />
                        <SelectInput
                          name="planned-expenses-type"
                          value={filters.planning_type ?? ''}
                          onChange={(planning_type) => setFilters((current) => ({ ...current, planning_type: String(planning_type) }))}
                          options={[
                            { label: 'Obligatorio puntual', value: 'mandatory_one_off' },
                            { label: 'Mantenimiento', value: 'irregular_maintenance' },
                            { label: 'Deseo', value: 'wish' },
                            { label: 'Compra planeada', value: 'planned_purchase' },
                          ]}
                          placeholder="Todos los tipos"
                        />
                        <SelectInput
                          name="planned-expenses-category"
                          value={filters.category_id ?? ''}
                          onChange={(category_id) => setFilters((current) => ({ ...current, category_id: String(category_id) }))}
                          options={categoryOptions}
                          placeholder="Todas las categorías"
                        />
                      </div>
                    </div>
                  ) : null}

                  <AppliedFiltersBar
                    chips={appliedChips}
                    onRemove={removeChip}
                    onClearAll={() => setFilters(initialFilters)}
                  />
                </div>
              ) : (
                <div className={styles.detailPanel}>
                  <div className={styles.metrics}>
                    <div className={styles.metricCard}>
                      <span className={styles.metricLabel}>Guardado</span>
                      <strong className={styles.metricValue}>{formatCurrencyCompact(metrics.fundBalance)}</strong>
                    </div>
                    <div className={styles.metricCard}>
                      <span className={styles.metricLabel}>Aporte mensual</span>
                      <strong className={styles.metricValue}>{formatCurrencyCompact(metrics.fundMonthly)}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {loading ? <Spinner size="lg" /> : null}
          {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
          {!loading && !error && activeTab === 'planned' && !plannedExpenses.length ? (
            <EmptyState
              title={activeFilterCount || filters.q ? 'No hubo resultados' : 'No hay gastos planeados'}
              description={
                activeFilterCount || filters.q
                  ? 'Prueba limpiando filtros o cambia el criterio de búsqueda para recuperar resultados.'
                  : 'Registra el próximo gasto previsible antes de que entre al flujo mensual o a transacciones.'
              }
              actionLabel={activeFilterCount || filters.q ? 'Limpiar filtros' : 'Nuevo gasto planeado'}
              onAction={() => {
                if (activeFilterCount || filters.q) {
                  setFilters(initialFilters);
                  return;
                }
                setEditingExpense(null);
                setComposerOpen(true);
              }}
            />
          ) : null}
          {!loading && !error && activeTab === 'pockets' && !sinkingFunds.length ? (
            <EmptyState
              title="No hay bolsillos activos"
              description="Todavía no existen bolsillos vinculados a gastos planeados. Revisa los planeados abiertos para empezar a fondearlos." 
              actionLabel="Ver planeados"
              onAction={() => setActiveTab('planned')}
            />
          ) : null}

          {!loading && !error && activeTab === 'planned' && plannedExpenses.length && detailsOpen ? (
            <div className={styles.list}>
              {plannedExpenses.map((plannedExpense) => (
                <PlannedExpenseSlidingCard
                  key={plannedExpense.id}
                  plannedExpense={plannedExpense}
                  onChangeStatus={(nextExpense, status) => {
                    void handleChangeStatus(nextExpense, status);
                  }}
                  onEdit={(nextExpense) => {
                    setEditingExpense(nextExpense);
                    setComposerOpen(true);
                  }}
                />
              ))}
            </div>
          ) : null}
          {!loading && !error && activeTab === 'pockets' && sinkingFunds.length && detailsOpen ? (
            <div className={styles.list}>
              {sinkingFunds.map((fund) => {
                const target = fund.target_amount ?? 0;
                const hasTarget = target > 0;
                const progress = hasTarget ? Math.min(Math.round((fund.current_balance / target) * 100), 100) : null;
                const linkedExpense = fund.planned_expense_id ? plannedById.get(fund.planned_expense_id) : null;
                return (
                  <article key={fund.id} className={styles.pocketCard}>
                    <div className={styles.pocketHeader}>
                      <span className={styles.pocketName}>{fund.name}</span>
                      {progress !== null ? (
                        <span className={styles.pill}>{progress}%</span>
                      ) : (
                        <span className={`${styles.pill} ${styles.pillMuted}`}>Sin meta</span>
                      )}
                    </div>
                    <div className={styles.pocketBalance}>
                      <span className={styles.pocketAmount}>{formatCurrencyCompact(fund.current_balance)}</span>
                      <span className={styles.pocketAmountSub}>
                        {hasTarget ? `de ${formatCurrencyCompact(target)}` : 'acumulado'}
                      </span>
                    </div>
                    {hasTarget ? (
                      <div className={styles.progressTrack}>
                        <div className={styles.progressFill} style={{ width: `${progress}%` }} />
                      </div>
                    ) : null}
                    <div className={styles.pocketFooter}>
                      <span className={styles.pocketFooterItem}>
                        {formatCurrencyCompact(fund.monthly_contribution)} / mes
                      </span>
                      {fund.target_date ? (
                        <span className={styles.pocketFooterItem}>· Objetivo {formatDate(fund.target_date)}</span>
                      ) : null}
                      {linkedExpense ? (
                        <span className={styles.pocketFooterItem}>· {linkedExpense.attributes.name}</span>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </section>

        <SortSheet
          isOpen={sortOpen}
          title="Ordenar gastos planeados"
          sortBy={String(filters.sort_by ?? 'target_date')}
          sortDir={(filters.sort_dir as 'asc' | 'desc') ?? 'asc'}
          options={[
            { label: 'Fecha objetivo', value: 'target_date' },
            { label: 'Monto estimado', value: 'amount_estimated' },
            { label: 'Nombre', value: 'name' },
            { label: 'Estado', value: 'status' },
            { label: 'Tipo', value: 'planning_type' },
          ]}
          onClose={() => setSortOpen(false)}
          onChangeSortBy={(sort_by) => setFilters((current) => ({ ...current, sort_by }))}
          onChangeSortDir={(sort_dir) => setFilters((current) => ({ ...current, sort_dir }))}
        />

        <CrudModal
          isOpen={composerOpen}
          title={editingExpense ? 'Editar gasto planeado' : 'Nuevo gasto planeado'}
          subtitle="Usa esta entidad para gastos futuros previsibles que todavía no deben vivir como transacción ni como recurrente mensual."
          onClose={() => {
            setComposerOpen(false);
            setEditingExpense(null);
          }}
        >
          <PlannedExpenseComposer
            plannedExpense={editingExpense}
            loading={submitting}
            categories={categories}
            onCreate={handleCreate}
            onUpdate={handleUpdate}
            onCancel={() => {
              setComposerOpen(false);
              setEditingExpense(null);
            }}
          />
        </CrudModal>
        {toast}
    </IonContent>
  );
};

export const PlannedExpensesPage = () => (
  <AppLayout title="Planeados">
    <PlannedExpensesContent />
  </AppLayout>
);
