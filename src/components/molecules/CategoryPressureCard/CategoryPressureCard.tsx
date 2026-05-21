import { formatCurrencyCompact } from '../../../utils/formatCurrency';
import styles from './CategoryPressureCard.module.css';

export type CategoryType = 'committed' | 'necessary' | 'discretionary' | 'investment' | 'social' | 'income' | 'unknown';

interface CategoryPressureCardProps {
  name: string;
  pct: number;
  spent: number;
  limit: number;
  category: CategoryType;
}

export const CategoryPressureCard = ({ name, pct, spent, limit, category }: CategoryPressureCardProps) => {
  const over = pct > 100;
  return (
    <div className={`${styles.card} ${styles[category]}`}>
      <div className={styles.head}>
        <span className={styles.name}>{name}</span>
        <span className={`${styles.pct} ${over ? styles.over : ''}`}>{pct}%</span>
      </div>
      <div className={styles.track}>
        <div
          className={`${styles.fill} ${over ? styles.fillOver : ''}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <div className={styles.foot}>
        <span>{formatCurrencyCompact(spent)} gastado</span>
        <span>de {formatCurrencyCompact(limit)}</span>
      </div>
    </div>
  );
};
