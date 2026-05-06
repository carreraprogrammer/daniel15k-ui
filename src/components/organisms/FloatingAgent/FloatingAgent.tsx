import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AvatarNucleus } from '../../atoms/AvatarNucleus'
import { useProgressStore, LEVEL_NAMES } from '../../../store/progressStore'
import styles from './FloatingAgent.module.css'

export const FloatingAgent = () => {
  const { data, loading, fetchProgress, getEffectiveLevel } = useProgressStore()
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    fetchProgress()
  }, [fetchProgress])

  const level = getEffectiveLevel()
  const seed = data?.avatarSeed ?? '0'
  const levelName = LEVEL_NAMES[level] ?? 'Huevo'

  if (loading && !data) return null

  return createPortal(
    <>
      {isOpen && (
        <div
          className={styles.backdrop}
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className={`${styles.shell} ${isOpen ? styles.shellOpen : ''}`}>
        {isOpen && (
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <AvatarNucleus seed={seed} level={level} size={18} />
              <div className={styles.panelMeta}>
                <span className={styles.panelName}>{levelName}</span>
                <span className={styles.panelSub}>Nivel {level}</span>
              </div>
              <button
                className={styles.closeBtn}
                onClick={() => setIsOpen(false)}
                aria-label="Cerrar chat"
              >
                ✕
              </button>
            </div>

            <div className={styles.messages}>
              <p className={styles.emptyHint}>Pronto podrás hablar conmigo aquí.</p>
            </div>

            <div className={styles.inputBar}>
              <input
                className={styles.input}
                type="text"
                placeholder="Escribe algo…"
                disabled
              />
              <button className={styles.sendBtn} disabled aria-label="Enviar">→</button>
            </div>
          </div>
        )}

        <button
          className={styles.fab}
          onClick={() => setIsOpen((v) => !v)}
          aria-label={isOpen ? 'Cerrar agente' : 'Abrir agente'}
        >
          <AvatarNucleus seed={seed} level={level} size={16} />
        </button>
      </div>
    </>,
    document.body
  )
}
