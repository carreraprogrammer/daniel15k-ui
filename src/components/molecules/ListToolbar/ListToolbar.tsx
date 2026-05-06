import { useEffect, useRef, useState } from 'react';
import { IonIcon } from '@ionic/react';
import { closeOutline, funnelOutline, optionsOutline, searchOutline } from 'ionicons/icons';
import { IconButton } from '../../atoms/IconButton';
import styles from './ListToolbar.module.css';

export interface ListToolbarProps {
  searchLabel?: string;
  searchPlaceholder?: string;
  searchValue: string;
  resultLabel: string;
  density?: 'default' | 'compact';
  activeFilterCount?: number;
  onSearchChange: (value: string) => void;
  onOpenSort: () => void;
  onOpenFilters?: () => void;
}

export const ListToolbar = ({
  searchPlaceholder,
  searchValue,
  resultLabel,
  density = 'compact',
  activeFilterCount = 0,
  onSearchChange,
  onOpenSort,
  onOpenFilters,
}: ListToolbarProps) => {
  const [searchOpen, setSearchOpen] = useState(Boolean(searchValue));
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (searchValue && !searchOpen) {
      setSearchOpen(true);
    }
  }, [searchOpen, searchValue]);

  useEffect(() => {
    if (!searchOpen) {
      return;
    }

    inputRef.current?.focus();
  }, [searchOpen]);

  const handleToggleSearch = () => {
    if (searchOpen) {
      if (searchValue) {
        onSearchChange('');
      }
      setSearchOpen(false);
      return;
    }

    setSearchOpen(true);
  };

  return (
    <section className={[styles.toolbar, density === 'compact' ? styles.compact : ''].filter(Boolean).join(' ')}>
      <div className={styles.mainRow}>
        <div className={styles.searchDock}>
          <div
            className={[
              styles.searchShell,
              searchOpen || searchValue ? styles.searchShellOpen : '',
            ].filter(Boolean).join(' ')}
          >
            <button
              type="button"
              className={styles.searchToggle}
              aria-label={searchOpen ? 'Cerrar búsqueda' : 'Buscar'}
              onClick={handleToggleSearch}
            >
              <IonIcon icon={searchOpen ? closeOutline : searchOutline} />
            </button>

            <input
              ref={inputRef}
              type="search"
              name="list-toolbar-search"
              className={styles.searchInput}
              placeholder={searchPlaceholder ?? 'Buscar'}
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </div>
        </div>

        <div className={styles.actions}>
          <IconButton label="Ordenar" icon={<IonIcon icon={optionsOutline} />} onClick={onOpenSort} />
          {onOpenFilters ? (
            <div className={styles.filterWrap}>
              <IconButton label="Filtrar" icon={<IonIcon icon={funnelOutline} />} onClick={onOpenFilters} />
              {activeFilterCount ? <span className={styles.count}>{activeFilterCount}</span> : null}
            </div>
          ) : null}
        </div>
      </div>

      <p className={styles.resultLabel}>{resultLabel}</p>
    </section>
  );
};
