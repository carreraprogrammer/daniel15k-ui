import { IonIcon, IonItem, IonItemOption, IonItemOptions, IonItemSliding } from '@ionic/react';
import { createOutline, trashOutline } from 'ionicons/icons';
import type { IncomeSource } from '../../../types/finance.types';
import { cadenceLabel, classificationLabel, incomeWindowLabel, reliabilityLabel } from '../../../utils/incomeProfile';
import styles from './IncomeSourceSlidingCard.module.css';

const formatCop = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

export interface IncomeSourceSlidingCardProps {
  source: IncomeSource;
  onEdit: (source: IncomeSource) => void;
  onDelete: (source: IncomeSource) => void;
}

export const IncomeSourceSlidingCard = ({ source, onEdit, onDelete }: IncomeSourceSlidingCardProps) => (
  <IonItemSliding className={styles.sliding}>
    <IonItem className={styles.item} lines="none">
      <div className={styles.card}>
        <div className={styles.primary}>
          <div className={styles.header}>
            <span className={styles.meta}>{incomeWindowLabel(source.attributes)}</span>
            <span className={`${styles.classification} ${styles[`cls_${source.attributes.classification ?? 'base'}`]}`}>
              {classificationLabel(source.attributes.classification, source.attributes.is_variable)}
            </span>
          </div>
          <strong className={styles.name}>{source.attributes.name}</strong>
          <span className={styles.meta}>
            {cadenceLabel(source.attributes.cadence)} · {reliabilityLabel(source.attributes.reliability_score)}
          </span>
        </div>
        <div className={styles.secondary}>
          <span className={styles.label}>Mensual esperado</span>
          <strong className={styles.amount}>{formatCop(source.attributes.expected_amount)}</strong>
        </div>
      </div>
    </IonItem>

    <IonItemOptions side="end">
      <IonItemOption className={styles.optionEdit} onClick={() => onEdit(source)}>
        <IonIcon icon={createOutline} />
      </IonItemOption>
      <IonItemOption className={styles.optionDelete} onClick={() => onDelete(source)}>
        <IonIcon icon={trashOutline} />
      </IonItemOption>
    </IonItemOptions>
  </IonItemSliding>
);
