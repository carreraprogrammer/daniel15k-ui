import type { ReactNode } from 'react';

interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export const FormSection = ({ title, description, children }: FormSectionProps) => (
  <section
    style={{
      display: 'grid',
      gap: 'var(--space-4)',
      padding: 'var(--space-5)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: 'var(--radius-xl)',
      background: 'rgba(255, 255, 255, 0.03)',
    }}
  >
    <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
      <h3 style={{ margin: 0, fontSize: 'var(--text-lg)' }}>{title}</h3>
      {description ? (
        <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
          {description}
        </p>
      ) : null}
    </div>
    <div style={{ display: 'grid', gap: 'var(--space-3)' }}>{children}</div>
  </section>
);