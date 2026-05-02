import type { ReactNode } from 'react';
import { Button } from '../../atoms/Button';
import styles from '../EmptyState/EmptyState.module.css';

interface ErrorNoticeProps {
  title?: string;
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
  secondaryAction?: ReactNode;
}

export const ErrorNotice = ({
  title = 'Algo salió mal',
  message,
  retryLabel = 'Reintentar',
  onRetry,
  secondaryAction,
}: ErrorNoticeProps) => (
  <div className={[styles.state, styles.stateError].join(' ')} role="alert">
    <span className={[styles.badge, styles.badgeError].join(' ')}>Error</span>
    <div className={styles.copy}>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.message}>{message}</p>
    </div>
    {onRetry || secondaryAction ? (
      <div className={styles.actions}>
        {onRetry ? <Button label={retryLabel} onClick={onRetry} size="sm" /> : null}
        {secondaryAction}
      </div>
    ) : null}
  </div>
);