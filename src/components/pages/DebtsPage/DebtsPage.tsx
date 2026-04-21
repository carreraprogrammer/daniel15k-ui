import { useEffect, useMemo, useState } from 'react';
import { IonContent, IonIcon } from '@ionic/react';
import { addOutline } from 'ionicons/icons';
import { AppLayout } from '../../templates/AppLayout';
import { IconButton } from '../../atoms/IconButton';
import { Button } from '../../atoms/Button';
import { Spinner } from '../../atoms/Spinner';
import { SelectInput } from '../../atoms/SelectInput';
import { ErrorState } from '../../molecules/ErrorState';
import { EmptyState } from '../../molecules/EmptyState';
import { ConfirmModal } from '../../molecules/ConfirmModal';
import { CrudModal } from '../../molecules/CrudModal';
import { ListToolbar } from '../../molecules/ListToolbar';
import { AppliedFiltersBar } from '../../molecules/AppliedFiltersBar';
import { SortSheet } from '../../molecules/SortSheet';
import { FilterSheet } from '../../molecules/FilterSheet';
import { DebtComposer } from '../../organisms/DebtComposer';
import { DebtSlidingCard } from '../../organisms/DebtSlidingCard';
import { financeService } from '../../../services/financeService';
import type { Debt, DebtPayload, DebtQueryParams } from '../../../types/finance.types';
import styles from '../FinancePage.module.css';

const formatCop = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

const initialFilters: DebtQueryParams = {
  q: '',
  status: '',
  debt_type: '',
  sort_by: 'created_at',
  sort_dir: 'desc',
};

export const DebtsPage = () => {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [deletingDebt, setDeletingDebt] = useState<Debt | null>(null);
  const [filters, setFilters] = useState<DebtQueryParams>(initialFilters);
  const [draftFilters, setDraftFilters] = useState<DebtQueryParams>(initialFilters);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await financeService.fetchDebts(filters);
      setDebts(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar las deudas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [filters]);

  const metrics = useMemo(() => {
    const activeDebts = debts.filter((debt) => debt.attributes.status === 'active');
    return {
      totalBalance: activeDebts.reduce((sum, debt) => sum + debt.attributes.current_balance, 0),
      totalMonthly: activeDebts.reduce((sum, debt) => sum + debt.attributes.monthly_payment, 0),
      totalCount: debts.length,
      activeCount: activeDebts.length,
    };
  }, [debts]);
  const settledPct = metrics.totalCount ? Math.round(((metrics.totalCount - metrics.activeCount) / metrics.totalCount) * 100) : 0;

  const handleCreate = async (payload: DebtPayload) => {
    setSubmitting(true);
    try {
      await financeService.createDebt(payload);
      setComposerOpen(false);
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (id: string, payload: Partial<DebtPayload>) => {
    setSubmitting(true);
    try {
      await financeService.updateDebt(id, payload);
      setEditingDebt(null);
      setComposerOpen(false);
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingDebt) {
      return;
    }

    setSubmitting(true);
    try {
      await financeService.deleteDebt(deletingDebt.id);
      setDeletingDebt(null);
      if (editingDebt?.id === deletingDebt.id) {
        setEditingDebt(null);
      }
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'No fue posible borrar la deuda.');
    } finally {
      setSubmitting(false);
    }
  };

  const activeFilterCount = useMemo(
    () => [filters.status, filters.debt_type].filter(Boolean).length,
    [filters.debt_type, filters.status],
  );

  const appliedChips = useMemo(() => {
    const chips = [];
    if (filters.q) chips.push({ key: 'q', label: `Buscar: ${filters.q}` });
    if (filters.status) chips.push({ key: 'status', label: `Estado: ${filters.status}` });
    if (filters.debt_type) chips.push({ key: 'debt_type', label: `Tipo: ${filters.debt_type}` });
    return chips;
  }, [filters.debt_type, filters.q, filters.status]);

  const removeChip = (key: string) => {
    const next = { ...filters, [key]: '' };
    setFilters(next);
    setDraftFilters(next);
  };

  const quickToggle = (patch: Partial<DebtQueryParams>) => {
    const key = Object.keys(patch)[0] as keyof DebtQueryParams;
    const value = patch[key];
    const nextValue = filters[key] === value ? '' : value;
    const next = { ...filters, [key]: nextValue };
    setFilters(next);
    setDraftFilters(next);
  };

  return (
    <AppLayout title="Deudas">
      <IonContent className={styles.pageContent}>
      <section className={styles.stack}>
        {!detailsOpen ? (
          <div className={`${styles.focusCard} ${styles.focusCardFull}`}>
            <div className={styles.focusGrid}>
              <div className={styles.focusCopy}>
                <span className={styles.eyebrow}>Deudas</span>
                <p className={styles.focusQuestion}>¿Cuánta presión de deuda tengo hoy?</p>
                <h2 className={styles.focusTitle}>
                  {metrics.activeCount ? `${metrics.activeCount} deudas activas` : 'No hay deudas activas'}
                </h2>
                <p className={styles.focusText}>
                  Esta vista debería dejar claro cuánto debes y cuánto te exige al mes antes de abrir filtros, tablas o edición.
                </p>
              </div>
              <div>
                <div className={styles.focusValue}>{formatCop(metrics.totalBalance)}</div>
                <p className={styles.focusCaption}>Saldo activo acumulado</p>
              </div>
            </div>

            {metrics.totalCount ? (
              <section className={styles.focusSupport}>
                <div className={styles.focusSupportHeader}>
                  <h3 className={styles.focusSupportTitle}>Deuda ya resuelta</h3>
                  <span className={styles.focusSupportValue}>{settledPct}% cerrada</span>
                </div>
                <div className={styles.focusRail}>
                  <div className={styles.focusRailFill} style={{ width: `${settledPct}%` }} />
                </div>
                <p className={styles.focusSupportText}>
                  {metrics.totalCount - metrics.activeCount} de {metrics.totalCount} deudas ya no están activas.
                </p>
              </section>
            ) : null}

            <div className={styles.focusMeta}>
              <span className={styles.focusBadge}>{formatCop(metrics.totalMonthly)} al mes</span>
              <span className={styles.focusBadge}>{metrics.totalCount} registradas</span>
            </div>

            <div className={styles.focusActions}>
              <IconButton
                label="Nueva deuda"
                variant="primary"
                icon={<IonIcon icon={addOutline} />}
                onClick={() => {
                  setEditingDebt(null);
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
        ) : null}

        {detailsOpen ? (
          <div className={styles.detailStage}>
            <div className={styles.detailStageHeader}>
              <div className={styles.detailStageCopy}>
                <h3 className={styles.detailStageTitle}>Detalle de deudas</h3>
                <p className={styles.detailStageText}>La edición, los filtros y el listado completo viven aquí, no debajo del resumen inicial.</p>
              </div>
              <Button label="Volver al resumen" variant="ghost" onClick={() => setDetailsOpen(false)} />
            </div>
            <div className={styles.detailPanel}>
            <ListToolbar
              searchLabel="Buscar deudas"
              searchPlaceholder="Nombre de deuda"
              searchValue={filters.q ?? ''}
              resultLabel={`${metrics.totalCount} resultados`}
              activeFilterCount={activeFilterCount}
              onSearchChange={(q) => {
                const next = { ...filters, q };
                setFilters(next);
                setDraftFilters(next);
              }}
              onOpenSort={() => setSortOpen(true)}
              onOpenFilters={() => setFiltersOpen(true)}
            />

            <div className={styles.quickFilters}>
              <Button
                label="Activas"
                size="sm"
                variant={filters.status === 'active' ? 'primary' : 'ghost'}
                onClick={() => quickToggle({ status: 'active' })}
              />
              <Button
                label="Pagadas"
                size="sm"
                variant={filters.status === 'paid_off' ? 'primary' : 'ghost'}
                onClick={() => quickToggle({ status: 'paid_off' })}
              />
            </div>

            <AppliedFiltersBar
              chips={appliedChips}
              onRemove={removeChip}
              onClearAll={() => {
                setFilters(initialFilters);
                setDraftFilters(initialFilters);
              }}
            />
            </div>
          </div>
        ) : null}

        {loading ? <Spinner size="lg" /> : null}
        {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
        {!loading && !error && !debts.length ? <EmptyState message="No hay deudas registradas." /> : null}

        {!loading && !error && debts.length && detailsOpen ? (
          <div className={styles.list}>
            {debts.map((debt) => (
              <DebtSlidingCard
                key={debt.id}
                debt={debt}
                onEdit={(nextDebt) => {
                  setEditingDebt(nextDebt);
                  setComposerOpen(true);
                }}
                onDelete={setDeletingDebt}
              />
            ))}
          </div>
        ) : null}
      </section>

      <SortSheet
        isOpen={sortOpen}
        title="Ordenar deudas"
        sortBy={String(filters.sort_by ?? 'created_at')}
        sortDir={(filters.sort_dir as 'asc' | 'desc') ?? 'desc'}
        options={[
          { label: 'Más recientes', value: 'created_at' },
          { label: 'Nombre', value: 'name' },
          { label: 'Saldo', value: 'current_balance' },
          { label: 'Pago mensual', value: 'monthly_payment' },
        ]}
        onClose={() => setSortOpen(false)}
        onChangeSortBy={(sort_by) => setFilters((current) => ({ ...current, sort_by }))}
        onChangeSortDir={(sort_dir) => setFilters((current) => ({ ...current, sort_dir }))}
      />

      <FilterSheet
        isOpen={filtersOpen}
        title="Filtrar deudas"
        resultLabel={`Mostrar ${metrics.totalCount} resultados`}
        onClose={() => {
          setDraftFilters(filters);
          setFiltersOpen(false);
        }}
        onReset={() => setDraftFilters({ ...initialFilters, q: filters.q })}
        onApply={() => {
          setFilters(draftFilters);
          setFiltersOpen(false);
        }}
      >
        <section className={styles.sheetSection}>
          <h3 className={styles.sheetSectionTitle}>Estado</h3>
          <SelectInput
            name="debt-filter-status"
            value={draftFilters.status ?? ''}
            onChange={(status) => setDraftFilters((current) => ({ ...current, status: String(status) }))}
            options={[
              { label: 'Activa', value: 'active' },
              { label: 'Pagada', value: 'paid_off' },
              { label: 'Pausada', value: 'paused' },
              { label: 'En disputa', value: 'disputed' },
            ]}
            placeholder="Todos"
          />
        </section>
        <section className={styles.sheetSection}>
          <h3 className={styles.sheetSectionTitle}>Tipo</h3>
          <SelectInput
            name="debt-filter-type"
            value={draftFilters.debt_type ?? ''}
            onChange={(debt_type) => setDraftFilters((current) => ({ ...current, debt_type: String(debt_type) }))}
            options={[
              { label: 'Tarjeta de crédito', value: 'credit_card' },
              { label: 'Préstamo personal', value: 'personal_loan' },
              { label: 'Familiar', value: 'family' },
              { label: 'Hipoteca', value: 'mortgage' },
            ]}
            placeholder="Todos"
          />
        </section>
      </FilterSheet>

      <ConfirmModal
        isOpen={Boolean(deletingDebt)}
        title="Borrar deuda"
        message={
          deletingDebt
            ? `Vas a borrar "${deletingDebt.attributes.name}". Esta acción no se puede deshacer.`
            : ''
        }
        confirmLabel="Borrar"
        danger
        onCancel={() => setDeletingDebt(null)}
        onConfirm={() => void handleDelete()}
      />

      <CrudModal
        isOpen={composerOpen}
        title={editingDebt ? 'Editar deuda' : 'Nueva deuda'}
        onClose={() => {
          setComposerOpen(false);
          setEditingDebt(null);
        }}
      >
        <DebtComposer
          debt={editingDebt}
          loading={submitting}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onCancel={() => {
            setComposerOpen(false);
            setEditingDebt(null);
          }}
        />
      </CrudModal>
      </IonContent>
    </AppLayout>
  );
};
