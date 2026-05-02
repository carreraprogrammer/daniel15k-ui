import { Button } from '../../atoms/Button';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState = ({ message, actionLabel, onAction }: EmptyStateProps) => (
  <div className={styles.state}>
    <span className={styles.badge}>Sin contenido</span>
    <p className={styles.message}>{message}</p>
    {actionLabel && onAction ? <Button label={actionLabel} onClick={onAction} size="sm" /> : null}
  </div>
);
