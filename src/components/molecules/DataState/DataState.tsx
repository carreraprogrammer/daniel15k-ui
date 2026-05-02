import type { ReactNode } from 'react';
import { EmptyState } from '../EmptyState';
import { ErrorNotice } from '../ErrorNotice/ErrorNotice';
import { LoadingOverlay } from '../LoadingOverlay/LoadingOverlay';

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
    return <LoadingOverlay isOpen message="Cargando datos..." zIndex="var(--z-raised)" />;
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