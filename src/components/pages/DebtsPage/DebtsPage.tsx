import { useEffect, useMemo, useState } from 'react';
import { IonIcon } from '@ionic/react';
import { addOutline } from 'ionicons/icons';
import { AppLayout } from '../../templates/AppLayout';
import { IconButton } from '../../atoms/IconButton';
import { Spinner } from '../../atoms/Spinner';
import { ErrorState } from '../../molecules/ErrorState';
import { EmptyState } from '../../molecules/EmptyState';
import { ConfirmModal } from '../../molecules/ConfirmModal';
import { CrudModal } from '../../molecules/CrudModal';
import { DebtComposer } from '../../organisms/DebtComposer';
import { DebtSlidingCard } from '../../organisms/DebtSlidingCard';
import { financeService } from '../../../services/financeService';
import type { Debt, DebtPayload } from '../../../types/finance.types';
import styles from '../FinancePage.module.css';

const formatCop = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

export const DebtsPage = () => {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [deletingDebt, setDeletingDebt] = useState<Debt | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await financeService.fetchDebts();
      setDebts(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar las deudas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const metrics = useMemo(() => {
    const activeDebts = debts.filter((debt) => debt.attributes.status === 'active');
    return {
      totalBalance: activeDebts.reduce((sum, debt) => sum + debt.attributes.current_balance, 0),
      totalMonthly: activeDebts.reduce((sum, debt) => sum + debt.attributes.monthly_payment, 0),
      totalCount: debts.length,
      activeCount: activeDebts.length,
    };
  }, [debts]);

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

  return (
    <AppLayout title="Deudas">
      <section className={styles.stack}>
        <div className={styles.hero}>
          <div className={styles.listItem}>
            <div className={styles.listPrimary}>
              <span className={styles.eyebrow}>Finanzas</span>
              <h2 className={styles.headline}>Deudas activas y seguimiento manual</h2>
              <p className={styles.description}>
                Corrige saldos, pagos y estados cuando el agente no interprete bien una deuda.
              </p>
            </div>
            <div className={styles.listSecondary}>
              <IconButton
                label="Nueva deuda"
                variant="primary"
                icon={<IonIcon icon={addOutline} />}
                onClick={() => {
                  setEditingDebt(null);
                  setComposerOpen(true);
                }}
              />
            </div>
          </div>
        </div>

        {!loading ? (
          <div className={styles.metrics}>
            <article className={styles.metricCard}>
              <span className={styles.metricLabel}>Saldo activo total</span>
              <strong className={styles.metricValue}>{formatCop(metrics.totalBalance)}</strong>
            </article>
            <article className={styles.metricCard}>
              <span className={styles.metricLabel}>Pago mensual total</span>
              <strong className={styles.metricValue}>{formatCop(metrics.totalMonthly)}</strong>
            </article>
            <article className={styles.metricCard}>
              <span className={styles.metricLabel}>Deudas activas</span>
              <strong className={styles.metricValue}>{metrics.activeCount}</strong>
            </article>
            <article className={styles.metricCard}>
              <span className={styles.metricLabel}>Registros totales</span>
              <strong className={styles.metricValue}>{metrics.totalCount}</strong>
            </article>
          </div>
        ) : null}

        {loading ? <Spinner size="lg" /> : null}
        {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
        {!loading && !error && !debts.length ? <EmptyState message="No hay deudas registradas." /> : null}

        {!loading && !error && debts.length ? (
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
    </AppLayout>
  );
};
