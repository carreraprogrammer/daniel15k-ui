import styles from './CoachBubble.module.css';

interface CoachBubbleProps {
  children: React.ReactNode;
  tone?: 'calm' | 'warn' | 'tense';
}

export const CoachBubble = ({ children, tone = 'calm' }: CoachBubbleProps) => (
  <div className={styles.bubble} data-tone={tone}>
    <span className={styles.dot} data-pulse={tone !== 'calm' ? 'true' : undefined}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/>
      </svg>
    </span>
    <div className={styles.text}>{children}</div>
  </div>
);
