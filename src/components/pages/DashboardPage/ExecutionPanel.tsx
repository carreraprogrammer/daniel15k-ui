import { useState, useCallback } from 'react';
import { financeService } from '../../../services/financeService';
import { formatCurrencyCompact } from '../../../utils/formatCurrency';
import type {
  SummaryMonthExecution,
  MonthExecutionStatus,
  Transaction,
} from '../../../types/finance.types';
import styles from './ExecutionPanel.module.css';

interface Props {
  monthExecution: SummaryMonthExecution;
  period: { month: number; year: number };
  onReload: () => void;
}

type LinkTarget =
  | { kind: 'income'; id: number; name: string }
  | { kind: 'obligation'; id: number; name: string }
  | null;

const STATUS_ICON: Record<MonthExecutionStatus, string> = {
  covered:   '✓',
  partial:   '~',
  pending:   '○',
  unplanned: '?',
};

export const ExecutionPanel = ({ monthExecution, period, onReload }: Props) => {
  const [linkTarget, setLinkTarget] = useState<LinkTarget>(null);
  const [modalTxs, setModalTxs] = useState<Transaction[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [linking, setLinking] = useState<string | null>(null);

  const openLink = useCallback(async (target: NonNullable<LinkTarget>) => {
    setLinkTarget(target);
    setModalLoading(true);
    setModalTxs([]);
    try {
      const res = await financeService.fetchTransactions({
        month: period.month,
        year: period.year,
        transaction_type: target.kind === 'income' ? 'income' : 'expense',
        status: 'confirmed',
        per_page: 50,
        sort_by: 'date',
        sort_dir: 'desc',
      });
      setModalTxs(res.data);
    } finally {
      setModalLoading(false);
    }
  }, [period]);

  const closeModal = useCallback(() => {
    setLinkTarget(null);
    setModalTxs([]);
  }, []);

  const handleLink = useCallback(async (txId: string) => {
    if (!linkTarget) return;
    setLinking(txId);
    try {
      const payload =
        linkTarget.kind === 'income'
          ? { income_source_id: linkTarget.id }
          : { recurring_obligation_id: linkTarget.id };
      await financeService.linkTransaction(txId, payload);
      closeModal();
      onReload();
    } finally {
      setLinking(null);
    }
  }, [linkTarget, closeModal, onReload]);

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
            <span className={styles.rowIcon}>{STATUS_ICON[src.status]}</span>
            <div className={styles.rowInfo}>
              <span className={styles.rowName}>{src.name}</span>
              {src.expected_day_from != null && src.expected_day_to != null ? (
                <span className={styles.rowMeta}>días {src.expected_day_from}–{src.expected_day_to}</span>
              ) : null}
            </div>
            <div className={styles.rowAmounts}>
              <span className={styles.rowDelivered}>{formatCurrencyCompact(src.delivered_amount)}</span>
              <span className={styles.rowExpected}>/ {formatCurrencyCompact(src.expected_amount)}</span>
            </div>
            {src.status !== 'covered' ? (
              <button
                type="button"
                className={styles.linkBtn}
                onClick={() => void openLink({ kind: 'income', id: src.id, name: src.name })}
              >
                Vincular
              </button>
            ) : null}
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
            <span className={styles.rowIcon}>{STATUS_ICON[item.status]}</span>
            <div className={styles.rowInfo}>
              <span className={styles.rowName}>{item.name}</span>
              {item.due_day != null ? (
                <span className={styles.rowMeta}>día {item.due_day}</span>
              ) : null}
            </div>
            <div className={styles.rowAmounts}>
              <span className={styles.rowDelivered}>{formatCurrencyCompact(item.covered_amount)}</span>
              <span className={styles.rowExpected}>/ {formatCurrencyCompact(item.expected_amount)}</span>
            </div>
            {item.status !== 'covered' ? (
              <button
                type="button"
                className={styles.linkBtn}
                onClick={() => void openLink({ kind: 'obligation', id: item.id, name: item.name })}
              >
                Vincular
              </button>
            ) : null}
          </div>
        ))}
      </div>

      {/* ── Modal de vinculación ── */}
      {linkTarget ? (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <p className={styles.modalTitle}>
              Vincular a <strong>{linkTarget.name}</strong>
            </p>
            <p className={styles.modalHint}>
              {linkTarget.kind === 'income'
                ? 'Seleccioná el ingreso confirmado que corresponde a esta fuente.'
                : 'Seleccioná el gasto confirmado que cubre esta obligación.'}
            </p>
            {modalLoading ? (
              <p className={styles.modalEmpty}>Cargando…</p>
            ) : modalTxs.length === 0 ? (
              <p className={styles.modalEmpty}>
                No hay transacciones confirmadas de este tipo este mes.
              </p>
            ) : (
              <div className={styles.modalList}>
                {modalTxs.map((tx) => (
                  <button
                    key={tx.id}
                    type="button"
                    className={styles.modalRow}
                    disabled={linking === tx.id}
                    onClick={() => void handleLink(tx.id)}
                  >
                    <div className={styles.modalRowInfo}>
                      <span className={styles.modalRowConcept}>{tx.attributes.concept}</span>
                      <span className={styles.modalRowMeta}>
                        {tx.attributes.date}
                        {tx.attributes.product ? ` · ${tx.attributes.product}` : ''}
                      </span>
                    </div>
                    <span className={styles.modalRowAmount}>
                      {formatCurrencyCompact(tx.attributes.amount)}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <button type="button" className={styles.modalCancel} onClick={closeModal}>
              Cancelar
            </button>
          </div>
        </div>
      ) : null}

    </div>
  );
};
