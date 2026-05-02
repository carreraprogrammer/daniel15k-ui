import { Spinner } from '../../atoms/Spinner';

interface LoadingOverlayProps {
  isOpen: boolean;
  message?: string;
  zIndex?: string;
}

export const LoadingOverlay = ({
  isOpen,
  message = 'Cargando...',
  zIndex = 'calc(var(--z-modal) + 1)',
}: LoadingOverlayProps) => {
  if (!isOpen) return null;

  return (
    <div
      aria-busy="true"
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-4)',
        background: 'rgba(5, 7, 12, 0.72)',
        zIndex,
      }}
    >
      <Spinner size="lg" />
      <p
        style={{
          margin: 0,
          color: 'var(--color-text-secondary)',
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-sm)',
        }}
      >
        {message}
      </p>
    </div>
  );
};