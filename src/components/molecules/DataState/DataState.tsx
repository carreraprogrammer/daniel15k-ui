import type { ReactNode } from 'react';
import { EmptyState } from '../EmptyState';
import { ErrorNotice } from '../ErrorNotice/ErrorNotice';
import { Spinner } from '../../atoms/Spinner';

interface DataStateProps<T> {
  loading: boolean;
  error?: string | null;
  data?: T[] | null;
  emptyTitle: string;
  emptyDescription: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  onRetry?: () => void;
  children: (data: T[]) => ReactNode;
}

export const DataState = <T,>({
  loading,
  error,
  data,
  emptyTitle,
  emptyDescription,
  emptyActionLabel,
  onEmptyAction,
  onRetry,
  children,
}: DataStateProps<T>) => {
  if (loading) {
    return (
      <div
        aria-busy="true"
        style={{
          display: 'grid',
          placeItems: 'center',
          gap: 'var(--space-3)',
          padding: 'var(--space-6)',
        }}
      >
        <Spinner size="lg" />
        <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
          Cargando datos...
        </span>
      </div>
    );
  }

  if (error) {
    return <ErrorNotice message={error} onRetry={onRetry} />;
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
      />
    );
  }

  return <>{children(data)}</>;
};