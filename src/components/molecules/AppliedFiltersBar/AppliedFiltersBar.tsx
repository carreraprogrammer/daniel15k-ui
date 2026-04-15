import { Badge } from '../../atoms/Badge';
import { Button } from '../../atoms/Button';
import styles from './AppliedFiltersBar.module.css';

export interface AppliedFilterChip {
  key: string;
  label: string;
}

export interface AppliedFiltersBarProps {
  chips: AppliedFilterChip[];
  onRemove: (key: string) => void;
  onClearAll?: () => void;
}

export const AppliedFiltersBar = ({ chips, onRemove, onClearAll }: AppliedFiltersBarProps) => {
  if (!chips.length) {
    return null;
  }

  return (
    <section className={styles.wrap}>
      <div className={styles.chips}>
        {chips.map((chip) => (
          <Badge key={chip.key} label={chip.label} variant="brand" onRemove={() => onRemove(chip.key)} />
        ))}
      </div>
      {onClearAll ? <Button label="Limpiar todo" variant="ghost" size="sm" onClick={onClearAll} /> : null}
    </section>
  );
};
