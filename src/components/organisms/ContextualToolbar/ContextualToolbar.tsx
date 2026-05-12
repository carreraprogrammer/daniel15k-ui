import { useEffect, useRef, useState } from 'react';
import { IonIcon } from '@ionic/react';
import { closeOutline, searchOutline } from 'ionicons/icons';
import { IconButton } from '../../atoms/IconButton';
import type { AppToolbarConfig } from '../../templates/AppLayout/AppLayoutContext';
import styles from './ContextualToolbar.module.css';

type ContextualToolbarProps = AppToolbarConfig;

export const ContextualToolbar = ({
  title,
  subtitle,
  searchPlaceholder,
  searchValue = '',
  resultLabel,
  onSearchChange,
  actions = [],
}: ContextualToolbarProps) => {
  const [searchOpen, setSearchOpen] = useState(Boolean(searchValue));
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (searchValue && !searchOpen) {
      setSearchOpen(true);
    }
  }, [searchOpen, searchValue]);

  useEffect(() => {
    if (searchOpen) {
      inputRef.current?.focus();
    }
  }, [searchOpen]);

  const handleToggleSearch = () => {
    if (!onSearchChange) {
      return;
    }

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
    <section className={styles.toolbar}>
      <div className={styles.mainRow}>
        <div className={styles.copy}>
          {subtitle ? <span className={styles.subtitle}>{subtitle}</span> : null}
          <strong className={styles.title}>{title}</strong>
        </div>

        <div className={styles.actions}>
          {onSearchChange ? (
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
                className={styles.searchInput}
                placeholder={searchPlaceholder ?? 'Buscar'}
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
              />
            </div>
          ) : null}

          {actions.map((action) => (
            <div key={action.key} className={styles.actionWrap}>
              <IconButton label={action.label} icon={action.icon} onClick={action.onClick} variant={action.active ? 'primary' : 'ghost'} />
              {action.badgeCount ? <span className={styles.count}>{action.badgeCount}</span> : null}
            </div>
          ))}
        </div>
      </div>

      {resultLabel ? <p className={styles.resultLabel}>{resultLabel}</p> : null}
    </section>
  );
};