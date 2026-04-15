import { IonIcon } from '@ionic/react';
import { funnelOutline, optionsOutline } from 'ionicons/icons';
import { TextInput } from '../../atoms/TextInput';
import { IconButton } from '../../atoms/IconButton';
import styles from './ListToolbar.module.css';

export interface ListToolbarProps {
  searchLabel?: string;
  searchPlaceholder?: string;
  searchValue: string;
  resultLabel: string;
  activeFilterCount?: number;
  onSearchChange: (value: string) => void;
  onOpenSort: () => void;
  onOpenFilters: () => void;
}

export const ListToolbar = ({
  searchLabel = 'Buscar',
  searchPlaceholder,
  searchValue,
  resultLabel,
  activeFilterCount = 0,
  onSearchChange,
  onOpenSort,
  onOpenFilters,
}: ListToolbarProps) => (
  <section className={styles.toolbar}>
    <div className={styles.search}>
      <TextInput
        name="list-toolbar-search"
        label={searchLabel}
        placeholder={searchPlaceholder}
        value={searchValue}
        onChange={onSearchChange}
      />
    </div>
    <div className={styles.actions}>
      <IconButton label="Ordenar" icon={<IonIcon icon={optionsOutline} />} onClick={onOpenSort} />
      <div className={styles.filterWrap}>
        <IconButton label="Filtrar" icon={<IonIcon icon={funnelOutline} />} onClick={onOpenFilters} />
        {activeFilterCount ? <span className={styles.count}>{activeFilterCount}</span> : null}
      </div>
    </div>
    <p className={styles.resultLabel}>{resultLabel}</p>
  </section>
);
