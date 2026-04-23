import { SheetModal } from '../SheetModal';
import styles from './SortSheet.module.css';

export interface SortOption {
  label: string;
  value: string;
}

export interface SortSheetProps {
  isOpen: boolean;
  title: string;
  sortBy: string;
  sortDir: 'asc' | 'desc';
  options: SortOption[];
  onClose: () => void;
  onChangeSortBy: (value: string) => void;
  onChangeSortDir: (value: 'asc' | 'desc') => void;
}

export const SortSheet = ({
  isOpen,
  title,
  sortBy,
  sortDir,
  options,
  onClose,
  onChangeSortBy,
  onChangeSortDir,
}: SortSheetProps) => (
  <SheetModal isOpen={isOpen} title={title} onClose={onClose} height="compact">
    <div className={styles.content}>
      <div className={styles.snapshot}>
        <div className={styles.snapshotCard}>
          <span className={styles.snapshotLabel}>Orden actual</span>
          <strong className={styles.snapshotValue}>
            {options.find((option) => option.value === sortBy)?.label ?? 'Sin definir'}
          </strong>
        </div>
        <div className={styles.snapshotCard}>
          <span className={styles.snapshotLabel}>Dirección</span>
          <strong className={styles.snapshotValue}>{sortDir === 'desc' ? 'Descendente' : 'Ascendente'}</strong>
        </div>
      </div>

      <section className={styles.section}>
        <h3 className={styles.heading}>Ordenar por</h3>
        <div className={styles.options}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={[styles.option, sortBy === option.value ? styles.optionActive : ''].filter(Boolean).join(' ')}
              onClick={() => onChangeSortBy(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.heading}>Dirección</h3>
        <div className={styles.options}>
          <button
            type="button"
            className={[styles.option, sortDir === 'desc' ? styles.optionActive : ''].filter(Boolean).join(' ')}
            onClick={() => onChangeSortDir('desc')}
          >
            Descendente
          </button>
          <button
            type="button"
            className={[styles.option, sortDir === 'asc' ? styles.optionActive : ''].filter(Boolean).join(' ')}
            onClick={() => onChangeSortDir('asc')}
          >
            Ascendente
          </button>
        </div>
      </section>
    </div>
  </SheetModal>
);
