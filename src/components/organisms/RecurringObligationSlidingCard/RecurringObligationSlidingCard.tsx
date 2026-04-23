import { IonIcon, IonItem, IonItemOption, IonItemOptions, IonItemSliding } from '@ionic/react';
import { createOutline, trashOutline } from 'ionicons/icons';
import type { RecurringObligation } from '../../../types/finance.types';
import styles from './RecurringObligationSlidingCard.module.css';

const formatCop = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

const toKebab = (name: string) => name.replace(/([A-Z])/g, '-$1').toLowerCase();

export interface RecurringObligationSlidingCardProps {
  obligation: RecurringObligation;
  onEdit: (obligation: RecurringObligation) => void;
  onDelete: (obligation: RecurringObligation) => void;
}

export const RecurringObligationSlidingCard = ({
  obligation,
  onEdit,
  onDelete,
}: RecurringObligationSlidingCardProps) => {
  const attrs    = obligation.attributes;
  const catCode  = attrs.category_code ?? 'unknown';
  const catColor = `var(--color-${catCode})`;
  const iconName = toKebab(attrs.subcategory_icon ?? 'repeat-outline');
  const isActive = attrs.active !== false;

  return (
    <IonItemSliding className={styles.sliding}>
      <IonItem className={styles.item} lines="none">
        <div
          className={styles.card}
          style={{ '--cat-color': catColor } as React.CSSProperties}
        >
          {/* ── Icon ── */}
          <div className={styles.iconWrap} aria-hidden="true">
            <ion-icon name={iconName} class={styles.iconGlyph} />
          </div>

          {/* ── Primary info ── */}
          <div className={styles.primary}>
            <strong className={styles.name}>{attrs.name}</strong>

            <div className={styles.chipRow}>
              {attrs.category_name && (
                <span className={styles.catChip}>
                  <span className={styles.catDot} />
                  {attrs.category_name}
                </span>
              )}
              {attrs.subcategory_name && (
                <span className={styles.subChip}>{attrs.subcategory_name}</span>
              )}
              {!attrs.category_name && !attrs.subcategory_name && (
                <span className={styles.subChip}>Sin categoría</span>
              )}
            </div>

            <span className={styles.meta}>
              {attrs.due_day ? `Día ${attrs.due_day}` : 'Sin fecha fija'}
            </span>
          </div>

          {/* ── Secondary info ── */}
          <div className={styles.secondary}>
            <strong className={styles.amount}>{formatCop(attrs.amount)}</strong>
            <span className={[styles.badge, isActive ? styles.badgeActive : styles.badgeInactive].join(' ')}>
              {isActive ? 'Activa' : 'Inactiva'}
            </span>
          </div>
        </div>
      </IonItem>

      <IonItemOptions side="end">
        <IonItemOption className={styles.optionEdit} onClick={() => onEdit(obligation)}>
          <IonIcon icon={createOutline} />
        </IonItemOption>
        <IonItemOption className={styles.optionDelete} onClick={() => onDelete(obligation)}>
          <IonIcon icon={trashOutline} />
        </IonItemOption>
      </IonItemOptions>
    </IonItemSliding>
  );
};
