import { IonIcon } from '@ionic/react';
import { checkmarkCircleOutline, ellipseOutline, helpCircleOutline, removeCircleOutline } from 'ionicons/icons';
import { formatCurrencyCompact } from '../../../utils/formatCurrency';
import type { SummaryMonthExecution, MonthExecutionStatus } from '../../../types/finance.types';
import styles from './ExecutionPanel.module.css';

interface Props {
  monthExecution: SummaryMonthExecution;
}

const STATUS_ICON: Record<MonthExecutionStatus, string> = {
  covered:   checkmarkCircleOutline,
  partial:   removeCircleOutline,
  pending:   ellipseOutline,
  unplanned: helpCircleOutline,
};

const STATUS_LABEL: Record<MonthExecutionStatus, string> = {
  covered:   'Cubierto',
  partial:   'Parcial',
  pending:   'Pendiente',
  unplanned: 'No planeado',
};

export const ExecutionPanel = ({ monthExecution }: Props) => {
  const { income, recurring_obligations } = monthExecution;

  return (
    <div className={styles.panel}>

      {/* ── Ingresos ── */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>Ingresos del mes</span>
          <span className={styles.sectionMeta}>
            {formatCurrencyCompact(income.delivered_expected_total)}
            {' / '}
            {formatCurrencyCompact(income.expected_total)}
          </span>
        </div>
        {income.sources.map((src) => (
          <div key={src.id} className={[styles.row, styles[`row_${src.status}`]].join(' ')}>
            <IonIcon className={styles.rowIcon} icon={STATUS_ICON[src.status]} aria-hidden="true" />
            <div className={styles.rowInfo}>
              <span className={styles.rowName}>{src.name}</span>
              <span className={styles.rowStatus}>{STATUS_LABEL[src.status]}</span>
              {src.expected_day_from != null && src.expected_day_to != null ? (
                <span className={styles.rowMeta}>días {src.expected_day_from}–{src.expected_day_to}</span>
              ) : null}
            </div>
            <div className={styles.rowAmounts}>
              <span className={styles.rowDelivered}>{formatCurrencyCompact(src.delivered_amount)}</span>
              <span className={styles.rowExpected}>/ {formatCurrencyCompact(src.expected_amount)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Obligaciones ── */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>Obligaciones del mes</span>
          <span className={styles.sectionMeta}>
            {recurring_obligations.covered_count}/{recurring_obligations.total_count}
            {' · '}
            {formatCurrencyCompact(recurring_obligations.covered_total)}
            {' / '}
            {formatCurrencyCompact(recurring_obligations.expected_total)}
          </span>
        </div>
        {recurring_obligations.items.map((item) => (
          <div key={item.id} className={[styles.row, styles[`row_${item.status}`]].join(' ')}>
            <IonIcon className={styles.rowIcon} icon={STATUS_ICON[item.status]} aria-hidden="true" />
            <div className={styles.rowInfo}>
              <span className={styles.rowName}>{item.name}</span>
              <span className={styles.rowStatus}>{STATUS_LABEL[item.status]}</span>
              {item.due_day != null ? (
                <span className={styles.rowMeta}>día {item.due_day}</span>
              ) : null}
            </div>
            <div className={styles.rowAmounts}>
              <span className={styles.rowDelivered}>{formatCurrencyCompact(item.covered_amount)}</span>
              <span className={styles.rowExpected}>/ {formatCurrencyCompact(item.expected_amount)}</span>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
