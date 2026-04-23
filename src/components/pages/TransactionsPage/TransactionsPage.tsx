import { useMemo, useState, type CSSProperties } from 'react';
import { IonContent, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, useIonAlert, useIonToast } from '@ionic/react';
import { addOutline } from 'ionicons/icons';
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
import type { Transaction, TransactionCreatePayload, TransactionUpdatePayload } from '../../../types/finance.types';
import { resolveTransactionCategory } from '../../../utils/financeBehavior';
import { initialTransactionFilters, useTransactionsPage } from '../../../hooks/useTransactionsPage';
import { resolveNamedIcon } from '../../organisms/BudgetWizard/iconRegistry';
import styles from '../FinancePage.module.css';

const formatCop = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

export const TransactionsPage = () => {
  const [composerOpen, setComposerOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [presentAlert] = useIonAlert();
  const [presentToast] = useIonToast();

  const {
    transactions,
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

  const latestTransaction = transactions[0] ?? null;
  const latestCategory = useMemo(
    () => (latestTransaction ? resolveTransactionCategory(latestTransaction, categoryLookup) : null),
    [categoryLookup, latestTransaction],
  );
  const reviewPressurePct = metrics.count ? Math.round((metrics.pendingCount / metrics.count) * 100) : 0;
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
      message: `¿Seguro que quieres borrar "${transaction.attributes.concept}" por ${formatCop(transaction.attributes.amount)}?`,
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

  const removeChip = (key: string) => {
    const next = { ...filters, [key]: '' };
    if (key === 'category_id') {
      next.subcategory_id = '';
    }
    setFilters(next);
  };

  return (
    <AppLayout title="Transacciones">
      <IonContent className={styles.pageContent}>
      <section className={`${styles.stack} ${!detailsOpen ? styles.stackFill : ''}`}>
        {!detailsOpen ? (
          <div className={styles.focusStage}>
            <div className={`${styles.focusCard} ${styles.focusCardFull} ${styles.focusCardCentered}`}>
              <div className={styles.focusGrid}>
                <div className={styles.focusCopy}>
                  <span className={styles.eyebrow}>Transacciones</span>
                  <p className={styles.focusQuestion}>¿Qué fue lo último que pasó y necesito revisar?</p>
                  <h2 className={styles.focusTitle}>
                    {latestTransaction ? latestTransaction.attributes.concept : 'Todavía no hay movimientos en esta vista'}
                  </h2>
                  <p className={styles.focusText}>
                    {latestTransaction
                      ? 'La pantalla inicial debería bastar para confirmar que tu último movimiento quedó bien y decidir si hay que corregirlo.'
                      : 'Cuando registres movimientos, esta vista mostrará primero el último caso para que no tengas que escanear toda la lista.'}
                  </p>
                </div>
                <div>
                  <div className={styles.focusValue}>
                    {latestTransaction ? formatCop(latestTransaction.attributes.amount) : '—'}
                  </div>
                  <p className={styles.focusCaption}>
                    {latestTransaction
                      ? `${latestTransaction.attributes.date} · ${latestTransaction.attributes.status === 'pending' ? 'Pendiente' : 'Confirmada'}`
                      : 'Sin transacciones visibles todavía'}
                  </p>
                </div>
              </div>

              {metrics.count ? (
                <section className={styles.focusSupport}>
                  <div className={styles.focusSupportHeader}>
                    <h3 className={styles.focusSupportTitle}>Casos que piden revisión</h3>
                    <span className={styles.focusSupportValue}>{metrics.pendingCount} de {metrics.count}</span>
                  </div>
                  <div className={styles.focusRail}>
                    <div
                      className={`${styles.focusRailFill} ${reviewPressurePct >= 40 ? styles.focusRailFillWarn : ''}`}
                      style={{ width: `${reviewPressurePct}%` }}
                    />
                  </div>
                  <p className={styles.focusSupportText}>
                    {reviewPressurePct === 0
                      ? 'No hay ruido pendiente en esta vista.'
                      : `${reviewPressurePct}% de la vista sigue pidiendo confirmación o aclaración.`}
                  </p>
                </section>
              ) : null}

              <div className={styles.focusMeta}>
                {latestCategory ? (
                  <span className={styles.focusBadge}>
                    {latestCategory.categoryName}
                    {latestCategory.subcategoryName ? ` · ${latestCategory.subcategoryName}` : ''}
                  </span>
                ) : null}
                <span className={styles.focusBadge}>{metrics.count} resultados</span>
                <span className={styles.focusBadge}>{metrics.pendingCount} pendientes</span>
              </div>

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
                {latestTransaction ? (
                  <Button
                    label="Editar última"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingTransaction(latestTransaction);
                      setComposerOpen(true);
                    }}
                  />
                ) : null}
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
        onClose={() => {
          setComposerOpen(false);
          setEditingTransaction(null);
        }}
      >
        <TransactionComposer
          transaction={editingTransaction}
          loading={submitting}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onCancel={() => {
            setComposerOpen(false);
            setEditingTransaction(null);
          }}
        />
      </CrudModal>
    </AppLayout>
  );
};
