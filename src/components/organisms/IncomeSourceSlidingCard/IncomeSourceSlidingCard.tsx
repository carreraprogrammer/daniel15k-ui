import { IonIcon, IonItem, IonItemSliding } from '@ionic/react';
import { cashOutline } from 'ionicons/icons';
import type { IncomeSource } from '../../../types/finance.types';
import { cadenceLabel, classificationLabel, incomeWindowLabel, reliabilityLabel } from '../../../utils/incomeProfile';
import { formatCurrencyCompact } from '../../../utils/formatCurrency';
import { SlideActions } from '../../molecules/SlideActions';
import styles from './IncomeSourceSlidingCard.module.css';

export interface IncomeSourceSlidingCardProps {
  source: IncomeSource;
  onEdit: (source: IncomeSource) => void;
  onDelete: (source: IncomeSource) => void;
}

export const IncomeSourceSlidingCard = ({ source, onEdit, onDelete }: IncomeSourceSlidingCardProps) => (
  <IonItemSliding className={styles.sliding}>
    <IonItem className={styles.item} lines="none">
      <div className={styles.card} style={{ '--cat-color': 'var(--color-income)' } as React.CSSProperties}>
        <div className={styles.iconWrap} aria-hidden="true">
          <IonIcon icon={cashOutline} className={styles.iconGlyph} />
        </div>
        <div className={styles.primary}>
          <div className={styles.chipRow}>
            <span className={`${styles.classification} ${styles[`cls_${source.attributes.classification ?? 'base'}`]}`}>
              {classificationLabel(source.attributes.classification, source.attributes.is_variable)}
            </span>
          </div>
          <strong className={styles.name}>{source.attributes.name}</strong>
          <span className={styles.meta}>
            {incomeWindowLabel(source.attributes)} · {cadenceLabel(source.attributes.cadence)} · {reliabilityLabel(source.attributes.reliability_score)}
          </span>
        </div>
        <div className={styles.secondary}>
          <strong className={styles.amount}>{formatCurrencyCompact(source.attributes.expected_amount)}</strong>
          <span className={styles.label}>Mensual esperado</span>
        </div>
      </div>
    </IonItem>

    <SlideActions actions={[
      { type: 'edit',   onPress: () => onEdit(source) },
      { type: 'delete', onPress: () => onDelete(source) },
    ]} />
  </IonItemSliding>
);
