import type { ReactNode } from 'react';
import { Button } from '../../atoms/Button';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
  title?: string;
  description?: string;
  message?: string;
  badgeLabel?: string;
  actionLabel?: string;
  onAction?: () => void;
  action?: ReactNode;
}

export const EmptyState = ({
  title = 'Sin contenido',
  description,
  message,
  badgeLabel = 'Sin contenido',
  actionLabel,
  onAction,
  action,
}: EmptyStateProps) => (
  <div className={styles.state}>
    <span className={styles.badge}>{badgeLabel}</span>
    <div className={styles.copy}>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.message}>{description ?? message}</p>
    </div>
    {actionLabel && onAction ? (
      <div className={styles.actions}>
        <Button label={actionLabel} onClick={onAction} size="sm" />
        {action}
      </div>
    ) : action ? <div className={styles.actions}>{action}</div> : null}
  </div>
);
