import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { IonIcon } from '@ionic/react';
import { menuOutline, personCircleOutline } from 'ionicons/icons';
import { Link } from 'react-router-dom';
import { Button } from '../../atoms/Button';
import { BrandMark } from '../../atoms/BrandMark';
import { AvatarNucleus } from '../../atoms/AvatarNucleus';
import { useAuthStore } from '../../../store/authStore';
import { useProgressStore, LEVEL_NAMES } from '../../../store/progressStore';
import styles from './Header.module.css';

export const Header = ({
  currentSection,
  onMenuToggle,
  menuOpen = false,
}: {
  currentSection?: string;
  onMenuToggle?: () => void;
  menuOpen?: boolean;
}) => {
  const logout = useAuthStore((state) => state.logout);
  const { data, fetchProgress, getEffectiveLevel } = useProgressStore();
  const [agentOpen, setAgentOpen] = useState(false);

  useEffect(() => { fetchProgress() }, [fetchProgress]);

  const level = getEffectiveLevel();
  const seed = data?.avatarSeed ?? '0';
  const levelName = LEVEL_NAMES[level] ?? 'Huevo';

  return (
    <header className={styles.header}>
      <div className={styles.brandBlock}>
        <button
          type="button"
          className={styles.menuButton}
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuOpen}
          onClick={onMenuToggle}
        >
          <IonIcon icon={menuOutline} />
        </button>
        <div className={styles.brandIdentity}>
          <BrandMark variant="monoline" size="md" />
          <div className={styles.brandCopy}>
            <span className={styles.kicker}>Daniel 15K</span>
            <strong className={styles.brand}>Ascent Finance</strong>
            {currentSection ? <span className={styles.section}>{currentSection}</span> : null}
          </div>
        </div>
      </div>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.avatarButton}
          onClick={() => setAgentOpen((v) => !v)}
          aria-label={agentOpen ? 'Cerrar agente' : 'Abrir agente'}
        >
          <AvatarNucleus seed={seed} level={level} size={28} />
        </button>
        <Link to="/profile" className={styles.mobileProfileLink} aria-label="Mi perfil">
          <IonIcon aria-hidden="true" icon={personCircleOutline} />
        </Link>
        <nav className={styles.nav}>
          <Link to="/profile" className={styles.link}>
            Mi perfil
          </Link>
          <Button label="Cerrar sesion" variant="ghost" onClick={() => void logout()} />
        </nav>
      </div>

      {agentOpen && createPortal(
        <>
          <div
            className={styles.agentBackdrop}
            onClick={() => setAgentOpen(false)}
            aria-hidden="true"
          />
          <div className={styles.agentPanel}>
            <div className={styles.agentHeader}>
              <AvatarNucleus seed={seed} level={level} size={32} />
              <div className={styles.agentMeta}>
                <span className={styles.agentName}>{levelName}</span>
                <span className={styles.agentSub}>Nivel {level}</span>
              </div>
              <button
                className={styles.agentClose}
                onClick={() => setAgentOpen(false)}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
            <div className={styles.agentMessages}>
              <p className={styles.agentEmptyHint}>Pronto podrás hablar conmigo aquí.</p>
            </div>
            <div className={styles.agentInputBar}>
              <input className={styles.agentInput} type="text" placeholder="Escribe algo…" disabled />
              <button className={styles.agentSendBtn} disabled aria-label="Enviar">→</button>
            </div>
          </div>
        </>,
        document.body
      )}
    </header>
  );
};
