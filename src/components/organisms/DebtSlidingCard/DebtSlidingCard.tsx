import { IonIcon, IonItem, IonItemOption, IonItemOptions, IonItemSliding } from '@ionic/react';
import { createOutline, linkOutline, trashOutline } from 'ionicons/icons';
import type { Debt } from '../../../types/finance.types';
import { formatCurrencyCompact } from '../../../utils/formatCurrency';
import styles from './DebtSlidingCard.module.css';

const statusLabels: Record<string, string> = {
  active: 'Activa',
  paid_off: 'Pagada',
  paused: 'Pausada',
  disputed: 'Disputa',
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
            <span className={styles.type}>{debt.attributes.debt_type}</span>
            <span className={`${styles.status} ${styles[`status_${debt.attributes.status}`] ?? ''}`}>
              {statusLabels[debt.attributes.status] ?? debt.attributes.status}
            </span>
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
        </div>
      </div>
    </IonItem>

    <IonItemOptions side="end">
      <IonItemOption className={styles.optionLink} onClick={() => onManageLink(debt)}>
        <IonIcon icon={linkOutline} />
      </IonItemOption>
      <IonItemOption className={styles.optionEdit} onClick={() => onEdit(debt)}>
        <IonIcon icon={createOutline} />
      </IonItemOption>
      <IonItemOption className={styles.optionDelete} onClick={() => onDelete(debt)}>
        <IonIcon icon={trashOutline} />
      </IonItemOption>
    </IonItemOptions>
  </IonItemSliding>
);
