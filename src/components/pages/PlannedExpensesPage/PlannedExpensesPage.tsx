import { useEffect, useMemo, useState } from 'react';
import { IonContent, IonIcon } from '@ionic/react';
import { addOutline, funnelOutline, optionsOutline } from 'ionicons/icons';
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
import { PlannedExpenseComposer } from '../../organisms/PlannedExpenseComposer';
import { PlannedExpenseSlidingCard } from '../../organisms/PlannedExpenseSlidingCard';
import { SinkingFundComposer } from '../../organisms/SinkingFundComposer';
import { useToast } from '../../../hooks/useToast';
import { financeService } from '../../../services/financeService';
import { getCategoryDisplayName } from '../../../utils/categoryLabels';
import { formatCurrencyCompact } from '../../../utils/formatCurrency';
import type {
  CategoryResource,
  PlannedExpense,
  PlannedExpensePayload,
  PlannedExpenseQueryParams,
  SinkingFund,
  SinkingFundPayload,
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
  const [fundComposerOpen, setFundComposerOpen] = useState(false);
  const [editingFund, setEditingFund] = useState<SinkingFund | null>(null);
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
        label: getCategoryDisplayName({
          name: category.attributes.name,
          code: category.attributes.code,
          type: category.attributes.category_type,
        }),
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

  const handleDeleteExpense = async (plannedExpense: PlannedExpense) => {
    if (!window.confirm(`¿Borrar el plan "${plannedExpense.attributes.name}"? Se borra también su bolsillo.`)) return;
    try {
      await financeService.deletePlannedExpense(plannedExpense.id);
      await load();
      showSuccess('Plan borrado.');
    } catch (nextError) {
      showError(nextError instanceof Error ? nextError.message : 'No fue posible borrar el plan.');
    }
  };

  const handleCreateFund = async (payload: SinkingFundPayload) => {
    setSubmitting(true);
    try {
      await financeService.createSinkingFund(payload);
      setFundComposerOpen(false);
      await load();
      showSuccess('Bolsillo creado.');
    } catch (nextError) {
      showError(nextError instanceof Error ? nextError.message : 'No fue posible crear el bolsillo.');
      throw nextError;
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateFund = async (id: number, payload: Partial<SinkingFundPayload>) => {
    setSubmitting(true);
    try {
      await financeService.updateSinkingFund(id, payload);
      setEditingFund(null);
      setFundComposerOpen(false);
      await load();
      showSuccess('Bolsillo actualizado.');
    } catch (nextError) {
      showError(nextError instanceof Error ? nextError.message : 'No fue posible actualizar el bolsillo.');
      throw nextError;
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteFund = async (fund: SinkingFund) => {
    if (!window.confirm(`¿Borrar el bolsillo "${fund.name}"? El saldo no se devuelve automáticamente.`)) return;
    try {
      await financeService.deleteSinkingFund(fund.id);
      await load();
      showSuccess('Bolsillo borrado.');
    } catch (nextError) {
      showError(nextError instanceof Error ? nextError.message : 'No fue posible borrar el bolsillo.');
    }
  };

  const handleWithdrawFund = async (fund: SinkingFund) => {
    const raw = window.prompt(
      `Retirar de "${fund.name}" (saldo ${formatCurrencyCompact(fund.current_balance)}). ` +
        'Monto a retirar; deja vacío para retirar todo:',
      '',
    );
    if (raw === null) return;
    const trimmed = raw.trim();
    const amount = trimmed === '' ? undefined : Number(trimmed.replace(/[^\d]/g, ''));
    if (amount !== undefined && (!Number.isFinite(amount) || amount <= 0)) {
      showError('Monto inválido.');
      return;
    }
    try {
      await financeService.withdrawSinkingFund(fund.id, amount);
      await load();
      showSuccess('Retiro realizado. Se devolvió al flujo de caja.');
    } catch (nextError) {
      showError(nextError instanceof Error ? nextError.message : 'No fue posible retirar del bolsillo.');
    }
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
  const toolbar = useMemo(
    () => (
      detailsOpen
        ? {
            title: activeTab === 'pockets' ? 'Bolsillos' : 'Planeado',
            subtitle: activeTab === 'pockets' ? 'Fondos para gastos futuros' : 'Gastos futuros previsibles',
            searchPlaceholder: activeTab === 'planned' ? 'SOAT, viaje, mantenimiento' : undefined,
            searchValue: activeTab === 'planned' ? (filters.q ?? '') : undefined,
            resultLabel: activeTab === 'planned' ? `${plannedExpenses.length} resultados` : undefined,
            onSearchChange: activeTab === 'planned'
              ? (q: string) => setFilters((current) => ({ ...current, q }))
              : undefined,
            actions: activeTab === 'planned'
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
    [activeFilterCount, activeTab, detailsOpen, filters.q, filtersVisible, plannedExpenses.length],
  );

  useAppToolbar(toolbar);

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
                  <Button
                    label="Nuevo bolsillo"
                    variant="ghost"
                    iconLeft={<IonIcon icon={addOutline} />}
                    onClick={() => {
                      setEditingFund(null);
                      setFundComposerOpen(true);
                    }}
                  />
                  <Button label="Explorar detalle" variant="ghost" onClick={() => setDetailsOpen(true)} />
                </div>
              </div>
            </div>
          ) : null}

          {detailsOpen ? (
            <div className={styles.detailStage}>
              <BreadcrumbTrail items={[
                { label: 'Planes', onClick: () => setDetailsOpen(false) },
                { label: activeTab === 'pockets' ? 'Bolsillos' : 'Detalle' },
              ]} />
              <div className={styles.detailStageHeader}>
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

          {loading ? <div className={styles.centeredState}><Spinner size="lg" /></div> : null}
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
              description="Crea un bolsillo para apartar dinero cada mes hacia un gasto futuro puntual (SOAT, mantenimiento, ropa)."
              actionLabel="Crear bolsillo"
              onAction={() => {
                setEditingFund(null);
                setFundComposerOpen(true);
              }}
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
                  onDelete={(nextExpense) => {
                    void handleDeleteExpense(nextExpense);
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
                    <div className={styles.focusActions}>
                      <Button
                        label="Editar"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingFund(fund);
                          setFundComposerOpen(true);
                        }}
                      />
                      <Button
                        label="Retirar"
                        variant="ghost"
                        size="sm"
                        disabled={fund.current_balance <= 0}
                        onClick={() => void handleWithdrawFund(fund)}
                      />
                      <Button
                        label="Borrar"
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleDeleteFund(fund)}
                      />
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

        <CrudModal
          isOpen={fundComposerOpen}
          title={editingFund ? 'Editar bolsillo' : 'Nuevo bolsillo'}
          subtitle="Aparta dinero cada mes hacia un gasto futuro puntual. El bolsillo pertenece a una de tus categorías y acumula hasta que llega el gasto."
          onClose={() => {
            setFundComposerOpen(false);
            setEditingFund(null);
          }}
        >
          <SinkingFundComposer
            fund={editingFund}
            loading={submitting}
            onCreate={handleCreateFund}
            onUpdate={handleUpdateFund}
            onCancel={() => {
              setFundComposerOpen(false);
              setEditingFund(null);
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
