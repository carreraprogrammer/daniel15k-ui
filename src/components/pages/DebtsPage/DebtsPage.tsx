import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
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
import { ConfirmModal } from '../../molecules/ConfirmModal';
import { CrudModal } from '../../molecules/CrudModal';
import { AppliedFiltersBar } from '../../molecules/AppliedFiltersBar';
import { SortSheet } from '../../molecules/SortSheet';
import { DebtComposer } from '../../organisms/DebtComposer';
import { DebtSlidingCard } from '../../organisms/DebtSlidingCard';
import { useToast } from '../../../hooks/useToast';
import { financeService } from '../../../services/financeService';
import { debtStatusOptions, debtTypeOptions, formatDebtStatus, formatDebtType } from '../../../utils/debtLabels';
import { formatCurrencyCompact } from '../../../utils/formatCurrency';
import type { Debt, DebtPayload, DebtQueryParams, RecurringObligation } from '../../../types/finance.types';
import styles from '../FinancePage.module.css';
import formStyles from '../../organisms/ComposerForm.module.css';

const initialFilters: DebtQueryParams = {
  q: '',
  status: '',
  debt_type: '',
  sort_by: 'created_at',
  sort_dir: 'desc',
};

export const DebtsContent = () => {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [obligations, setObligations] = useState<RecurringObligation[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [deletingDebt, setDeletingDebt] = useState<Debt | null>(null);
  const [linkingDebt, setLinkingDebt] = useState<Debt | null>(null);
  const [selectedObligationId, setSelectedObligationId] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [filters, setFilters] = useState<DebtQueryParams>(initialFilters);
  const { showError, showSuccess, toast } = useToast();
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [debtsResponse, obligationsResponse] = await Promise.all([
        financeService.fetchDebts(filters),
        financeService.fetchRecurringObligations({ active: 'all', sort_by: 'due_day', sort_dir: 'asc' }),
      ]);
      setDebts(debtsResponse.data);
      setObligations(obligationsResponse.data);
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
      showSuccess('Deuda guardada.');
    } catch (nextError) {
      showError(nextError instanceof Error ? nextError.message : 'No fue posible guardar la deuda.');
      throw nextError;
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
      showSuccess('Deuda actualizada.');
    } catch (nextError) {
      showError(nextError instanceof Error ? nextError.message : 'No fue posible actualizar la deuda.');
      throw nextError;
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
      showSuccess('Deuda borrada.');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'No fue posible borrar la deuda.');
      showError(deleteError instanceof Error ? deleteError.message : 'No fue posible borrar la deuda.');
    } finally {
      setSubmitting(false);
    }
  };

  const appliedChips = useMemo(() => {
    const chips = [];
    if (filters.q) chips.push({ key: 'q', label: `Buscar: ${filters.q}` });
    if (filters.status) chips.push({ key: 'status', label: `Estado: ${formatDebtStatus(filters.status)}` });
    if (filters.debt_type) chips.push({ key: 'debt_type', label: `Tipo: ${formatDebtType(filters.debt_type)}` });
    return chips;
  }, [filters.debt_type, filters.q, filters.status]);
  const activeFilterCount = useMemo(
    () => appliedChips.filter((chip) => chip.key !== 'q').length,
    [appliedChips],
  );
  const toolbar = useMemo(
    () => (
      detailsOpen
        ? {
            title: 'Deudas',
            subtitle: 'Detalle y seguimiento',
            searchPlaceholder: 'Nombre de deuda',
            searchValue: filters.q ?? '',
            resultLabel: `${metrics.totalCount} resultados`,
            onSearchChange: (q: string) => setFilters((current) => ({ ...current, q })),
            actions: [
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
            ],
          }
        : null
    ),
    [activeFilterCount, detailsOpen, filters.q, filtersVisible, metrics.totalCount],
  );

  useAppToolbar(toolbar);

  const linkedDebtIdForObligation = (obligation: RecurringObligation) => {
    if (obligation.attributes.source_type === 'Debt' && obligation.attributes.source_id) {
      return String(obligation.attributes.source_id);
    }
    return null;
  };

  const obligationCanLinkToDebt = (obligation: RecurringObligation) =>
    obligation.attributes.subcategory_code === 'creditos';

  const buildLinkedObligationMap = (items: RecurringObligation[]) => {
    const map = new Map<string, RecurringObligation>();
    items.forEach((obligation) => {
      const linkedDebtId = linkedDebtIdForObligation(obligation);
      if (linkedDebtId) {
        map.set(linkedDebtId, obligation);
      }
    });
    return map;
  };

  const getRequestErrorMessage = (nextError: unknown, fallback: string) => {
    if (axios.isAxiosError(nextError)) {
      const detail = nextError.response?.data?.errors?.[0]?.detail;
      if (typeof detail === 'string' && detail.trim()) {
        return detail;
      }
    }
    return nextError instanceof Error ? nextError.message : fallback;
  };

  const linkedObligationByDebtId = useMemo(() => {
    return buildLinkedObligationMap(obligations);
  }, [obligations]);

  const currentLinkedObligation = useMemo(
    () => (linkingDebt ? linkedObligationByDebtId.get(linkingDebt.id) ?? null : null),
    [linkedObligationByDebtId, linkingDebt],
  );

  const linkableObligationOptions = useMemo(() => {
    if (!linkingDebt) {
      return [];
    }

    return obligations
      .filter((obligation) => {
        const linkedDebtId = linkedDebtIdForObligation(obligation);
        return obligation.attributes.active !== false
          && obligationCanLinkToDebt(obligation)
          && (!linkedDebtId || linkedDebtId === linkingDebt.id);
      })
      .map((obligation) => ({
        label: `${obligation.attributes.name} · ${formatCurrencyCompact(obligation.attributes.amount)}${obligation.attributes.due_day ? ` · Día ${obligation.attributes.due_day}` : ''}`,
        value: obligation.id,
      }));
  }, [linkingDebt, obligations]);

  const handleOpenLinkModal = (debt: Debt) => {
    setLinkingDebt(debt);
    setSelectedObligationId(linkedObligationByDebtId.get(debt.id)?.id ?? '');
    setLinkError(null);
  };

  const handleCloseLinkModal = () => {
    setLinkingDebt(null);
    setSelectedObligationId('');
    setLinkError(null);
  };

  const handleSaveLink = async () => {
    if (!linkingDebt) {
      return;
    }

    setSubmitting(true);
    setLinkError(null);

    try {
      const [freshDebtsResponse, freshObligationsResponse] = await Promise.all([
        financeService.fetchDebts(filters),
        financeService.fetchRecurringObligations({ active: 'all', sort_by: 'due_day', sort_dir: 'asc' }),
      ]);

      const freshDebt = freshDebtsResponse.data.find((debt) => debt.id === linkingDebt.id) ?? null;
      if (!freshDebt) {
        setLinkError('La deuda ya no existe en la data más reciente. Recarga la vista y vuelve a intentar.');
        return;
      }

      const freshObligations = freshObligationsResponse.data;
      const freshLinkedObligationByDebtId = buildLinkedObligationMap(freshObligations);
      const currentlyLinked = freshLinkedObligationByDebtId.get(freshDebt.id) ?? null;
      const selectedObligation = freshObligations.find((obligation) => obligation.id === selectedObligationId) ?? null;

      if (selectedObligationId && !selectedObligation) {
        setLinkError('La obligación seleccionada ya no existe en la data más reciente. Recarga la vista y vuelve a intentar.');
        return;
      }

      if (selectedObligation && !obligationCanLinkToDebt(selectedObligation)) {
        setLinkError('Solo puedes vincular deudas a obligaciones recurrentes con subcategoría Créditos.');
        return;
      }

      const freshDebtId = Number(freshDebt.id);
      if (!Number.isFinite(freshDebtId) || freshDebtId <= 0) {
        setLinkError(`El id de la deuda no es válido: ${freshDebt.id}`);
        return;
      }

      if (currentlyLinked && currentlyLinked.id !== selectedObligation?.id) {
        await financeService.updateRecurringObligation(currentlyLinked.id, {
          source_type: null,
          source_id: null,
        });
      }

      if (selectedObligation && selectedObligation.id !== currentlyLinked?.id) {
        await financeService.updateRecurringObligation(selectedObligation.id, {
          source_type: 'Debt',
          source_id: freshDebtId,
        });
      }

      handleCloseLinkModal();
      await load();
      showSuccess(selectedObligation ? 'Vínculo guardado.' : 'Vínculo eliminado.');
    } catch (nextError) {
      const message = getRequestErrorMessage(nextError, 'No fue posible actualizar el vínculo con la obligación.');
      setLinkError(message);
      showError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const removeChip = (key: string) => {
    const next = { ...filters, [key]: '' };
    setFilters(next);
  };

  return (
    <IonContent className={styles.pageContent}>
      <section className={`${styles.stack} ${!detailsOpen ? styles.stackFill : ''}`}>
        {!detailsOpen ? (
          <div className={styles.focusStage}>
            <div className={`${styles.focusCard} ${styles.focusCardFull} ${styles.focusCardCentered}`}>
              <div className={styles.focusGrid}>
                <div className={styles.focusCopy}>
                  <span className={styles.eyebrow}>Deudas</span>
                  <p className={styles.focusQuestion}>¿Cuánta presión de deuda tengo hoy?</p>
                  <h2 className={styles.focusTitle}>
                    {metrics.activeCount ? `${metrics.activeCount} deudas activas` : 'No hay deudas activas'}
                  </h2>
                  <p className={styles.focusText}>
                    {metrics.totalCount === 0
                      ? 'Registra tus deudas para saber cuánta presión financiera cargas cada mes.'
                      : metrics.activeCount === 0
                        ? 'Todas tus deudas están cerradas. Sin carga activa en el flujo mensual.'
                        : `${formatCurrencyCompact(metrics.totalMonthly)} de carga mensual fija en ${metrics.activeCount} deudas activas.`}
                  </p>
                </div>
                <div>
                  <div className={styles.focusValue}>{formatCurrencyCompact(metrics.totalBalance)}</div>
                  <p className={styles.focusCaption}>Saldo activo acumulado</p>
                </div>
              </div>

              {metrics.totalCount ? (
                <section className={styles.focusSupport}>
                  <div className={styles.focusSupportHeader}>
                    <h3 className={styles.focusSupportTitle}>Deuda ya resuelta</h3>
                    <span className={styles.focusSupportValue}>{settledPct}% cerrada</span>
                  </div>
                  <div
                    className={styles.focusRail}
                    role="progressbar"
                    aria-valuenow={settledPct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Deuda ya resuelta: ${settledPct}%`}
                  >
                    <div className={styles.focusRailFill} style={{ width: `${settledPct}%` }} />
                  </div>
                  <p className={styles.focusSupportText}>
                    {metrics.totalCount - metrics.activeCount} de {metrics.totalCount} deudas ya no están activas.
                  </p>
                </section>
              ) : null}

              <div className={styles.focusMeta}>
                <span className={styles.focusBadge}>{formatCurrencyCompact(metrics.totalMonthly)} al mes</span>
                <span className={styles.focusBadge}>{metrics.totalCount} registradas</span>
              </div>

              <div className={styles.focusActions}>
                <Button
                  label="Nueva deuda"
                  variant="primary"
                  iconLeft={<IonIcon icon={addOutline} />}
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
          </div>
        ) : null}

        {detailsOpen ? (
          <div className={styles.detailStage}>
            <BreadcrumbTrail items={[
              { label: 'Deudas', onClick: () => setDetailsOpen(false) },
              { label: 'Detalle' },
            ]} />
            <div className={styles.detailPanel}>
            {filtersVisible ? (
              <div className={styles.filterPanel}>
                <div className={styles.inlineFilters}>
                  <SelectInput
                    name="debt-inline-status"
                    value={filters.status ?? ''}
                    onChange={(status) => setFilters((current) => ({ ...current, status: String(status) }))}
                    options={debtStatusOptions}
                    placeholder="Todos los estados"
                  />
                  <SelectInput
                    name="debt-inline-type"
                    value={filters.debt_type ?? ''}
                    onChange={(debt_type) => setFilters((current) => ({ ...current, debt_type: String(debt_type) }))}
                    options={debtTypeOptions}
                    placeholder="Todos los tipos"
                  />
                </div>
              </div>
            ) : null}

            <AppliedFiltersBar
              chips={appliedChips}
              onRemove={removeChip}
              onClearAll={() => {
                setFilters(initialFilters);
              }}
            />
            </div>
          </div>
        ) : null}

        {loading ? <div className={styles.centeredState}><Spinner size="lg" /></div> : null}
        {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
        {!loading && !error && !debts.length ? (
          <EmptyState
            title="No hay deudas registradas"
            description="Empieza con tu primera deuda para ver presión mensual, saldo activo y relación con obligaciones." 
            actionLabel="Nueva deuda"
            onAction={() => {
              setEditingDebt(null);
              setComposerOpen(true);
            }}
          />
        ) : null}

        {!loading && !error && debts.length && detailsOpen ? (
          <div className={styles.list}>
            {debts.map((debt) => (
              <DebtSlidingCard
                key={debt.id}
                debt={debt}
                linkedObligationLabel={
                  linkedObligationByDebtId.get(debt.id)
                    ? `Obligación vinculada: ${linkedObligationByDebtId.get(debt.id)?.attributes.name}`
                    : null
                }
                onManageLink={handleOpenLinkModal}
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
        subtitle="Concentra estructura, carga mensual y estado de la deuda sin ruido adicional."
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

      <CrudModal
        isOpen={Boolean(linkingDebt)}
        title={linkingDebt ? `Vincular cuota de ${linkingDebt.attributes.name}` : 'Vincular obligación'}
        subtitle="Usa esta relación para dejar explícito qué cuota mensual representa el impacto en caja de una deuda."
        onClose={handleCloseLinkModal}
      >
        <section className={formStyles.panel}>
          <div className={formStyles.section}>
            <div className={formStyles.sectionHeader}>
              <div>
                <p className={formStyles.sectionEyebrow}>Relación estructural</p>
                <h3 className={formStyles.sectionTitle}>Obligación recurrente asociada</h3>
              </div>
              <p className={formStyles.sectionText}>
                `debts` sigue siendo la verdad del pasivo; `recurring_obligations` sigue siendo la verdad del flujo mensual. Este vínculo solo conecta ambas vistas.
              </p>
            </div>

            <SelectInput
              name="debt-linked-obligation"
              label="Obligación recurrente"
              value={selectedObligationId}
              onChange={(value) => setSelectedObligationId(String(value))}
              options={linkableObligationOptions}
              placeholder="Sin obligación vinculada"
              hint={
                currentLinkedObligation
                  ? `Hoy está vinculada a "${currentLinkedObligation.attributes.name}".`
                  : 'Solo aparecen obligaciones activas que estén libres o ya vinculadas a esta deuda.'
              }
            />

            {linkError ? <p className={formStyles.error}>{linkError}</p> : null}

            <div className={formStyles.actions}>
              <Button label="Cancelar" variant="ghost" onClick={handleCloseLinkModal} />
              <Button
                label={selectedObligationId ? 'Guardar vínculo' : 'Guardar sin vínculo'}
                onClick={() => void handleSaveLink()}
                loading={submitting}
                disabled={!currentLinkedObligation && !linkableObligationOptions.length && !selectedObligationId}
              />
            </div>
          </div>
        </section>
      </CrudModal>
      {toast}
    </IonContent>
  );
};

export const DebtsPage = () => (
  <AppLayout title="Deudas">
    <DebtsContent />
  </AppLayout>
);
