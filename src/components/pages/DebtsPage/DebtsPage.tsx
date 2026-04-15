import { useEffect, useState } from 'react';
import { AppLayout } from '../../templates/AppLayout';
import { Spinner } from '../../atoms/Spinner';
import { ErrorState } from '../../molecules/ErrorState';
import { EmptyState } from '../../molecules/EmptyState';
import { financeService } from '../../../services/financeService';
import type { Debt } from '../../../types/finance.types';
import styles from '../FinancePage.module.css';

const formatCop = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

export const DebtsPage = () => {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <AppLayout title="Deudas">
      <section className={styles.stack}>
        <div className={styles.hero}>
          <span className={styles.eyebrow}>Finanzas</span>
          <h2 className={styles.headline}>Deudas activas y seguimiento manual</h2>
          <p className={styles.description}>
            Esta primera versión permite inspeccionar balances, pagos mensuales y el tipo de obligación cargada en la API.
          </p>
        </div>

        {loading ? <Spinner size="lg" /> : null}
        {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
        {!loading && !error && !debts.length ? <EmptyState message="No hay deudas registradas." /> : null}

        {!loading && !error && debts.length ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Deuda</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th className={styles.numeric}>Saldo</th>
                  <th className={styles.numeric}>Pago mensual</th>
                </tr>
              </thead>
              <tbody>
                {debts.map((debt) => (
                  <tr key={debt.id}>
                    <td>{debt.attributes.name}</td>
                    <td>{debt.attributes.debt_type}</td>
                    <td>{debt.attributes.status}</td>
                    <td className={styles.numeric}>{formatCop(debt.attributes.current_balance)}</td>
                    <td className={styles.numeric}>{formatCop(debt.attributes.monthly_payment)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </AppLayout>
  );
};
