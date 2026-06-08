import { IonItem, IonItemSliding } from '@ionic/react';
import { Badge, type BadgeStatus } from '../../atoms/Badge';
import type { Debt } from '../../../types/finance.types';
import { formatDebtStatus, formatDebtType } from '../../../utils/debtLabels';
import { formatCurrencyCompact } from '../../../utils/formatCurrency';
import { SlideActions } from '../../molecules/SlideActions';
import styles from './DebtSlidingCard.module.css';

const statusTone: Record<string, BadgeStatus> = {
  active: 'success',
  paid_off: 'success',
  paused: 'warning',
  disputed: 'warning',
};

export interface DebtSlidingCardProps {
  debt: Debt;
  linkedObligationLabel?: string | null;
  onManageLink: (debt: Debt) => void;
  onEdit: (debt: Debt) => void;
  onDelete: (debt: Debt) => void;
}

export const DebtSlidingCard = ({ debt, linkedObligationLabel, onManageLink, onEdit, onDelete }: DebtSlidingCardProps) => (
  <IonItemSliding className={styles.sliding}>
    <IonItem className={styles.item} lines="none">
      <div className={styles.card}>
        <div className={styles.primary}>
          <div className={styles.header}>
            <span className={styles.type}>{formatDebtType(debt.attributes.debt_type)}</span>
            <Badge
              label={formatDebtStatus(debt.attributes.status)}
              status={statusTone[debt.attributes.status] ?? 'neutral'}
              size="sm"
            />
          </div>
          <strong className={styles.name}>{debt.attributes.name}</strong>
          <span className={styles.meta}>Pago mensual {formatCurrencyCompact(debt.attributes.monthly_payment)}</span>
          <span className={styles.linked}>
            {linkedObligationLabel ?? 'Sin obligación recurrente vinculada'}
          </span>
        </div>

        <div className={styles.secondary}>
          <span className={styles.label}>Saldo</span>
          <strong className={styles.amount}>{formatCurrencyCompact(debt.attributes.current_balance)}</strong>
          {debt.attributes.interest_rate > 0 && (
            <span className={styles.meta}>{debt.attributes.interest_rate}% mensual</span>
          )}
        </div>
      </div>
    </IonItem>

    <SlideActions actions={[
      { type: 'link',   onPress: () => onManageLink(debt) },
      { type: 'edit',   onPress: () => onEdit(debt) },
      { type: 'delete', onPress: () => onDelete(debt) },
    ]} />
  </IonItemSliding>
);
