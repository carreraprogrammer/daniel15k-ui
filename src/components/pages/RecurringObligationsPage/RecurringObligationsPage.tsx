import { useEffect, useState } from 'react';
import { AppLayout } from '../../templates/AppLayout';
import { Spinner } from '../../atoms/Spinner';
import { ErrorState } from '../../molecules/ErrorState';
import { EmptyState } from '../../molecules/EmptyState';
import { financeService } from '../../../services/financeService';
import type { IncomeSource, RecurringObligation } from '../../../types/finance.types';
import styles from '../FinancePage.module.css';

const formatCop = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

export const RecurringObligationsPage = () => {
  const [obligations, setObligations] = useState<RecurringObligation[]>([]);
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [obligationsResponse, incomeResponse] = await Promise.all([
        financeService.fetchRecurringObligations(),
        financeService.fetchIncomeSources(),
      ]);
      setObligations(obligationsResponse.data);
      setIncomeSources(incomeResponse.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar la operación recurrente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <AppLayout title="Recurrentes">
      <section className={styles.stack}>
        <div className={styles.hero}>
          <span className={styles.eyebrow}>Finanzas</span>
          <h2 className={styles.headline}>Ingresos y obligaciones recurrentes</h2>
          <p className={styles.description}>
            Superficie manual mínima para revisar la base del wizard quincenal: entradas esperadas y compromisos fijos.
          </p>
        </div>

        {loading ? <Spinner size="lg" /> : null}
        {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

        {!loading && !error ? (
          <div className={styles.columns}>
            <section className={styles.panel}>
              <h3 className={styles.panelTitle}>Fuentes de ingreso</h3>
              {!incomeSources.length ? (
                <EmptyState message="No hay fuentes de ingreso cargadas." />
              ) : (
                <div className={styles.list}>
                  {incomeSources.map((source) => (
                    <article key={source.id} className={styles.listItem}>
                      <div className={styles.listPrimary}>
                        <span className={styles.listLabel}>{source.attributes.name}</span>
                        <span className={styles.listMeta}>
                          Día {source.attributes.expected_day_from} a {source.attributes.expected_day_to}
                        </span>
                      </div>
                      <div className={styles.listSecondary}>
                        <span className={styles.pill}>{source.attributes.is_variable ? 'Variable' : 'Fija'}</span>
                        <span className={styles.listLabel}>{formatCop(source.attributes.expected_amount)}</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className={styles.panel}>
              <h3 className={styles.panelTitle}>Obligaciones recurrentes</h3>
              {!obligations.length ? (
                <EmptyState message="No hay obligaciones recurrentes registradas." />
              ) : (
                <div className={styles.list}>
                  {obligations.map((obligation) => (
                    <article key={obligation.id} className={styles.listItem}>
                      <div className={styles.listPrimary}>
                        <span className={styles.listLabel}>{obligation.attributes.name}</span>
                        <span className={styles.listMeta}>Vence el día {obligation.attributes.due_day}</span>
                      </div>
                      <div className={styles.listSecondary}>
                        <span className={styles.listMeta}>{obligation.attributes.category_name ?? 'Sin categoría'}</span>
                        <span className={styles.listLabel}>{formatCop(obligation.attributes.amount)}</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : null}
      </section>
    </AppLayout>
  );
};
