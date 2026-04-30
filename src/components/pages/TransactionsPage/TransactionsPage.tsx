import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { IonContent, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, useIonAlert, useIonToast } from '@ionic/react';
import { addOutline, cardOutline } from 'ionicons/icons';
import { AppLayout } from '../../templates/AppLayout';
import { IconButton } from '../../atoms/IconButton';
import { Button } from '../../atoms/Button';
import { Spinner } from '../../atoms/Spinner';
import { SelectInput } from '../../atoms/SelectInput';
import { ErrorState } from '../../molecules/ErrorState';
import { EmptyState } from '../../molecules/EmptyState';
import { CrudModal } from '../../molecules/CrudModal';
import { ListToolbar } from '../../molecules/ListToolbar';
import { AppliedFiltersBar } from '../../molecules/AppliedFiltersBar';
import { SortSheet } from '../../molecules/SortSheet';
import { TransactionComposer } from '../../organisms/TransactionComposer';
import { TransactionSlidingCard } from '../../organisms/TransactionSlidingCard';
import type { IncomeSource, RecurringObligation, Transaction, TransactionCreatePayload, TransactionUpdatePayload } from '../../../types/finance.types';
import { resolveTransactionCategory } from '../../../utils/financeBehavior';
import { initialTransactionFilters, useTransactionsPage } from '../../../hooks/useTransactionsPage';
import { formatCurrencyCompact, formatCurrencyFull } from '../../../utils/formatCurrency';
import { resolveNamedIcon } from '../../organisms/BudgetWizard/iconRegistry';
import { financeService } from '../../../services/financeService';
import formStyles from '../../organisms/ComposerForm.module.css';
import styles from '../FinancePage.module.css';

export const TransactionsContent = () => {
  const [composerOpen, setComposerOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [linkingTransaction, setLinkingTransaction] = useState<Transaction | null>(null);
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [obligations, setObligations] = useState<RecurringObligation[]>([]);
  const [selectedLinkId, setSelectedLinkId] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkSubmitting, setLinkSubmitting] = useState(false);
  const [linkOptionsLoading, setLinkOptionsLoading] = useState(false);
  const [presentAlert] = useIonAlert();
  const [presentToast] = useIonToast();

  const {
    transactions,
    creditCardPending,
    summary,
    categories,
    loading,
    loadingMore,
    submitting,
    error,
    filters,
    metrics,
    categoryLookup,
    behaviorSummary,
    behaviorSignals,
    appliedChips,
    hasNextPage,
    loadMore,
    setError,
    setFilters,
    reload,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  } = useTransactionsPage();

  const loadLinkOptions = useCallback(async () => {
    setLinkOptionsLoading(true);
    try {
      const [srcRes, obRes] = await Promise.all([
        financeService.fetchIncomeSources({ active: 'all' }),
        financeService.fetchRecurringObligations({ active: 'all', sort_by: 'due_day', sort_dir: 'asc' }),
      ]);
      setIncomeSources(srcRes.data);
      setObligations(obRes.data);
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : 'No fue posible cargar las relaciones disponibles.');
    } finally {
      setLinkOptionsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLinkOptions();
  }, [loadLinkOptions]);

  const latestTransaction = transactions[0] ?? null;
  const creditCardPendingPreview = creditCardPending.slice(0, 4);

  const TYPE_LABELS: Record<string, string> = {
    committed:     'Comprometido',
    necessary:     'Necesario',
    discretionary: 'Discrecional',
    investment:    'Inversión',
    social:        'Social',
  };
  const TYPE_ORDER = ['committed', 'necessary', 'discretionary', 'investment', 'social'];
  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const monthName = summary?.period ? MESES[summary.period.month - 1] : MESES[new Date().getMonth()];

  const stackedSegments = useMemo(() => {
    const byType: Record<string, { spent: number; color: string; label: string }> = {};
    transactions
      .filter((t) => t.attributes.transaction_type === 'expense')
      .forEach((t) => {
        const catId = t.attributes.category_id;
        if (!catId) return;
        const cat = categories.find((c) => String(c.id) === String(catId));
        const type = cat?.attributes.category_type ?? 'other';
        const color = cat?.attributes.color ?? 'rgba(255,255,255,0.18)';
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
    const over = cats.filter((c) => !c.on_track && c.budget > 0);
    if (over.length) return over.reduce((a, b) => (a.pct > b.pct ? a : b));
    const withBudget = cats.filter((c) => c.budget > 0);
    if (withBudget.length) return withBudget.reduce((a, b) => (a.pct > b.pct ? a : b));
    return cats.reduce((a, b) => (a.spent > b.spent ? a : b));
  }, [summary]);
  const selectedCategoryId = filters.category_id ? String(filters.category_id) : '';
  const selectedSubcategoryId = filters.subcategory_id ? String(filters.subcategory_id) : '';
  const selectedCategory = useMemo(
    () => categories.find((category) => String(category.id) === selectedCategoryId) ?? null,
    [categories, selectedCategoryId],
  );
  const categoryAccent = selectedCategory?.attributes.color ?? '#7ce0d3';
  const categoryFilters = useMemo(
    () => categories.map((category) => ({
      id: String(category.id),
      name: category.attributes.name ?? 'Sin categoría',
      color: category.attributes.color ?? '#7ce0d3',
      count: category.relationships?.subcategories?.data?.length ?? 0,
    })),
    [categories],
  );
  const subcategoryFilters = useMemo(
    () =>
      selectedCategory?.relationships?.subcategories?.data?.map((subcategory) => ({
        id: String(subcategory.id),
        name: subcategory.attributes?.name ?? 'Sin subcategoría',
        icon: subcategory.attributes?.icon ?? undefined,
      })) ?? [],
    [selectedCategory],
  );
  const activeFilterCount = useMemo(
    () => appliedChips.filter((chip) => chip.key !== 'q').length,
    [appliedChips],
  );

  const handleCreate = async (payload: TransactionCreatePayload) => {
    await createTransaction(payload);
    setComposerOpen(false);
  };

  const handleUpdate = async (id: string, payload: TransactionUpdatePayload) => {
    await updateTransaction(id, payload);
    setEditingTransaction(null);
    setComposerOpen(false);
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
    const currentId = isIncome
      ? transaction.attributes.income_source_id
      : transaction.attributes.recurring_obligation_id;
    setLinkingTransaction(transaction);
    setSelectedLinkId(currentId ? String(currentId) : '');
    setLinkError(null);
    if ((isIncome && incomeSources.length === 0) || (!isIncome && obligations.length === 0)) {
      void loadLinkOptions();
    }
  };

  const handleCloseLinkModal = () => {
    setLinkingTransaction(null);
    setSelectedLinkId('');
    setLinkError(null);
  };

  const handleSaveLink = async () => {
    if (!linkingTransaction) return;
    setLinkSubmitting(true);
    setLinkError(null);
    const isIncome = linkingTransaction.attributes.transaction_type === 'income';
    try {
      await financeService.linkTransaction(linkingTransaction.id, isIncome
        ? { income_source_id: selectedLinkId ? Number(selectedLinkId) : null }
        : { recurring_obligation_id: selectedLinkId ? Number(selectedLinkId) : null },
      );
      handleCloseLinkModal();
      void reload();
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : 'No fue posible guardar el vínculo.');
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
                  <span className={styles.eyebrow}>{monthName}</span>
                  <div className={styles.focusValue}>
                    {formatCurrencyCompact(metrics.expenseTotal)}
                  </div>
                  <p className={styles.focusCaption}>gastados este mes</p>
                </div>
                <div className={styles.focusMeta} style={{ alignSelf: 'start', justifyContent: 'flex-end' }}>
                  {metrics.pendingCount > 0 ? (
                    <span className={styles.focusBadge}>{metrics.pendingCount} pendientes</span>
                  ) : null}
                  {metrics.creditCardPendingCount > 0 ? (
                    <span className={styles.focusBadge}>{formatCurrencyCompact(metrics.creditCardPendingTotal)} por pagar TC</span>
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
                <div className={`${styles.focusSupport} ${!spotlight.on_track ? styles.focusSupportWarn : ''}`}>
                  <div className={styles.focusSupportHeader}>
                    <h3 className={styles.focusSupportTitle}>
                      {!spotlight.on_track ? '⚠ ' : ''}{spotlight.category}
                    </h3>
                    <span className={styles.focusSupportValue}>{formatCurrencyCompact(spotlight.spent)}</span>
                  </div>
                  {spotlight.budget > 0 ? (
                    <>
                      <div className={styles.focusRail}>
                        <div
                          className={`${styles.focusRailFill} ${!spotlight.on_track ? styles.focusRailFillWarn : ''}`}
                          style={{ width: `${Math.min(spotlight.pct, 100)}%` }}
                        />
                      </div>
                      <p className={styles.focusSupportText}>
                        {spotlight.pct}% de {formatCurrencyCompact(spotlight.budget)} presupuestados
                        {!spotlight.on_track ? ' — va a superarse' : ''}
                      </p>
                    </>
                  ) : (
                    <p className={styles.focusSupportText}>mayor gasto del mes</p>
                  )}
                </div>
              ) : null}

              {creditCardPending.length > 0 ? (
                <section className={styles.creditPoolPanel}>
                  <div className={styles.creditPoolHeader}>
                    <div className={styles.creditPoolTitleWrap}>
                      <span className={styles.creditPoolIcon}>
                        <IonIcon icon={cardOutline} />
                      </span>
                      <div>
                        <h3 className={styles.creditPoolTitle}>Tarjeta de crédito pendiente</h3>
                        <p className={styles.creditPoolText}>
                          Compras ya registradas; falta confirmar el abono al banco.
                        </p>
                      </div>
                    </div>
                    <strong className={styles.creditPoolTotal}>{formatCurrencyCompact(metrics.creditCardPendingTotal)}</strong>
                  </div>
                  <div className={styles.creditPoolList}>
                    {creditCardPendingPreview.map((transaction) => (
                      <div key={transaction.id} className={styles.creditPoolRow}>
                        <span className={styles.creditPoolConcept}>{transaction.attributes.concept}</span>
                        <span className={styles.creditPoolAmount}>
                          {formatCurrencyCompact(transaction.attributes.amount)}
                        </span>
                      </div>
                    ))}
                    {creditCardPending.length > creditCardPendingPreview.length ? (
                      <div className={styles.creditPoolMore}>
                        +{creditCardPending.length - creditCardPendingPreview.length} compras más
                      </div>
                    ) : null}
                  </div>
                </section>
              ) : null}

              {/* Actions */}
              <div className={styles.focusActions}>
                <IconButton
                  label="Nueva transacción"
                  variant="primary"
                  icon={<IonIcon icon={addOutline} />}
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
            <div className={styles.detailStageHeader}>
              <div className={styles.detailStageCopy}>
                <h3 className={styles.detailStageTitle}>Detalle de transacciones</h3>
                <p className={styles.detailStageText}>Aquí sí entra búsqueda, filtros y lista completa. Ya no se apila debajo del resumen inicial.</p>
              </div>
              <Button label="Volver al resumen" variant="ghost" onClick={() => setDetailsOpen(false)} />
            </div>
            <div className={styles.detailPanel}>
            <ListToolbar
              searchPlaceholder="Concepto o producto"
              searchValue={filters.q ?? ''}
              resultLabel={`${metrics.count} resultados`}
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
                <div className={styles.inlineFilters}>
                  <SelectInput
                    name="tx-inline-status"
                    value={filters.status ?? ''}
                    onChange={(status) => setFilters((current) => ({ ...current, status: String(status) }))}
                    options={[
                      { label: 'Confirmada', value: 'confirmed' },
                      { label: 'Pendiente', value: 'pending' },
                    ]}
                    placeholder="Todos los estados"
                  />
                  <SelectInput
                    name="tx-inline-type"
                    value={filters.transaction_type ?? ''}
                    onChange={(transaction_type) =>
                      setFilters((current) => ({ ...current, transaction_type: String(transaction_type) }))
                    }
                    options={[
                      { label: 'Gasto', value: 'expense' },
                      { label: 'Ingreso', value: 'income' },
                    ]}
                    placeholder="Todos los tipos"
                  />
                  <SelectInput
                    name="tx-inline-source"
                    value={filters.source ?? ''}
                    onChange={(source) => setFilters((current) => ({ ...current, source: String(source) }))}
                    options={[{ label: 'Manual', value: 'manual' }]}
                    placeholder="Todos los orígenes"
                  />
                </div>

                <section className={styles.filterComposer}>
                  <div className={styles.filterComposerHeader}>
                    <span className={styles.filterComposerLabel}>Categoría</span>
                    <span className={styles.filterComposerHint}>Elige un color para abrir sus subcategorías.</span>
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
                          onClick={() => {
                            const nextCategoryId = active ? '' : category.id;
                            const next = {
                              ...filters,
                              category_id: nextCategoryId,
                              subcategory_id: '',
                            };
                            setFilters(next);
                          }}
                        >
                          <span className={styles.categorySwatch} />
                          <span className={styles.categoryTokenText}>{category.name}</span>
                        </button>
                      );
                    })}
                  </div>

                  {selectedCategory && subcategoryFilters.length ? (
                    <div
                      className={styles.subcategoryRail}
                      style={{ '--category-accent': categoryAccent } as CSSProperties}
                    >
                      {subcategoryFilters.map((subcategory) => {
                        const active = subcategory.id === selectedSubcategoryId;
                        return (
                          <button
                            key={subcategory.id}
                            type="button"
                            className={[styles.subcategoryToken, active ? styles.subcategoryTokenActive : ''].filter(Boolean).join(' ')}
                            onClick={() => {
                              const next = {
                                ...filters,
                                category_id: selectedCategory.id,
                                subcategory_id: active ? '' : subcategory.id,
                              };
                              setFilters(next);
                            }}
                          >
                            <span className={styles.subcategoryIconWrap}>
                              <IonIcon icon={resolveNamedIcon(subcategory.icon)} className={styles.subcategoryIcon} />
                            </span>
                            <span className={styles.subcategoryTokenText}>{subcategory.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </section>
              </div>
            ) : null}

            <AppliedFiltersBar
              chips={appliedChips}
              onRemove={removeChip}
              onClearAll={() => {
                setFilters(initialTransactionFilters);
              }}
            />
            </div>
          </div>
        ) : null}

        {loading ? <Spinner size="lg" /> : null}
        {error ? <ErrorState message={error} onRetry={() => void reload()} /> : null}
        {!loading && !error && !transactions.length ? <EmptyState message="No hay transacciones para el período actual." /> : null}

        {!loading && !error && transactions.length && detailsOpen ? (
          <div className={styles.list}>
            {transactions.map((transaction) => (
              <TransactionSlidingCard
                key={transaction.id}
                transaction={transaction}
                category={resolveTransactionCategory(transaction, categoryLookup)}
                onEdit={(nextTransaction) => {
                  setEditingTransaction(nextTransaction);
                  setComposerOpen(true);
                }}
                onDelete={(selectedTransaction) => {
                  void requestDelete(selectedTransaction);
                }}
                onLink={(tx) => { void handleOpenLink(tx); }}
              />
            ))}
          </div>
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
            : 'Asocia este gasto a una obligación recurrente para que el seguimiento del mes refleje el cubrimiento.'
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
  <AppLayout title="Transacciones">
    <TransactionsContent />
  </AppLayout>
);
