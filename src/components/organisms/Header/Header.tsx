import { useEffect, useRef, useState } from 'react';
import { IonIcon } from '@ionic/react';
import { closeOutline, menuOutline, personCircleOutline, searchOutline } from 'ionicons/icons';
import { Link } from 'react-router-dom';
import { BrandMark } from '../../atoms/BrandMark';
import { IconButton } from '../../atoms/IconButton';
import type { AppToolbarConfig } from '../../templates/AppLayout/AppLayoutContext';
import styles from './Header.module.css';

const parseGreetingTitle = (value?: string) => {
  if (!value) {
    return null;
  }

  const match = value.match(/^(Buenos días|Buenas tardes|Buenas noches)\s+(.+)$/u);
  if (!match) {
    return null;
  }

  return {
    greeting: match[1],
    name: match[2],
  };
};

export const Header = ({
  currentSection,
  toolbar,
  onMenuToggle,
  menuOpen = false,
}: {
  currentSection?: string;
  toolbar?: AppToolbarConfig | null;
  onMenuToggle?: () => void;
  menuOpen?: boolean;
}) => {
  const [searchOpen, setSearchOpen] = useState(Boolean(toolbar?.searchValue));
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (toolbar?.searchValue && !searchOpen) {
      setSearchOpen(true);
    }
  }, [searchOpen, toolbar?.searchValue]);

  useEffect(() => {
    if (searchOpen) {
      inputRef.current?.focus();
    }
  }, [searchOpen]);

  const handleToggleSearch = () => {
    if (!toolbar?.onSearchChange) {
      return;
    }

    if (searchOpen) {
      if (toolbar.searchValue) {
        toolbar.onSearchChange('');
      }
      setSearchOpen(false);
      return;
    }

    setSearchOpen(true);
  };

  const mobileTitle = toolbar?.title ?? currentSection;
  const mobileSubtitle = toolbar?.subtitle;
  const dashboardGreeting = !toolbar ? parseGreetingTitle(currentSection) : null;

  return (
    <header className={[styles.header, toolbar ? styles.headerContextual : ''].filter(Boolean).join(' ')}>
      <div className={[styles.brandBlock, toolbar ? styles.brandBlockContextual : ''].filter(Boolean).join(' ')}>
        <button
          type="button"
          className={styles.menuButton}
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuOpen}
          onClick={onMenuToggle}
        >
          <IonIcon icon={menuOutline} />
        </button>
        <div className={[styles.brandIdentity, toolbar ? styles.brandIdentityContextual : ''].filter(Boolean).join(' ')}>
          <BrandMark variant="monoline" size="md" />
          <div className={styles.brandCopy}>
            {dashboardGreeting ? (
              <div className={styles.greetingCopy}>
                <span className={styles.greetingLead}>{dashboardGreeting.greeting}</span>
                <strong className={styles.greetingName}>{dashboardGreeting.name}</strong>
              </div>
            ) : (
              <>
                <span className={styles.kicker}>Daniel 15K</span>
                <strong className={styles.brand}>Ascent Finance</strong>
                {currentSection ? <span className={styles.section}>{currentSection}</span> : null}
              </>
            )}
          </div>
          {toolbar ? (
            <div className={styles.contextualCopy}>
              {mobileSubtitle ? <span className={styles.contextualSubtitle}>{mobileSubtitle}</span> : null}
              {mobileTitle ? <strong className={styles.contextualTitle}>{mobileTitle}</strong> : null}
            </div>
          ) : null}
        </div>
      </div>
      <div className={[styles.actions, toolbar ? styles.actionsContextual : ''].filter(Boolean).join(' ')}>
        {toolbar?.onSearchChange ? (
          <div
            className={[
              styles.searchShell,
              searchOpen || toolbar.searchValue ? styles.searchShellOpen : '',
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
              placeholder={toolbar.searchPlaceholder ?? 'Buscar'}
              value={toolbar.searchValue ?? ''}
              onChange={(event) => toolbar.onSearchChange?.(event.target.value)}
            />
          </div>
        ) : null}
        {toolbar?.actions?.map((action) => (
          <div key={action.key} className={styles.actionWrap}>
            <IconButton
              label={action.label}
              icon={action.icon}
              onClick={action.onClick}
              variant={action.active ? 'primary' : 'ghost'}
            />
            {action.badgeCount ? <span className={styles.actionCount}>{action.badgeCount}</span> : null}
          </div>
        ))}
        <Link to="/profile" className={styles.mobileProfileLink} aria-label="Mi perfil">
          <IonIcon aria-hidden="true" icon={personCircleOutline} />
        </Link>
        <nav className={styles.nav}>
          <Link to="/profile" className={styles.link}>
            Mi perfil
          </Link>
        </nav>
      </div>
    </header>
  );
};
