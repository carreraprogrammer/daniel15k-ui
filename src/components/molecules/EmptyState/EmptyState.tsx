import styles from './EmptyState.module.css';

export const EmptyState = ({ message }: { message: string }) => (
  <div className={styles.state}>
    <span className={styles.badge}>Sin contenido</span>
    <p className={styles.message}>{message}</p>
  </div>
);
