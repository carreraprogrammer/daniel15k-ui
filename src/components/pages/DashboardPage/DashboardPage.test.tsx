import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { AgentUIProvider } from '../../../contexts/AgentUIContext';
import { useAuthStore } from '../../../store/authStore';
import { DashboardPage } from './DashboardPage';

vi.mock('../../molecules/AgentEventRenderer', () => ({
  AgentEventRenderer: () => null,
}));

vi.mock('../../molecules/CompletenessIndicator', () => ({
  CompletenessIndicator: () => null,
}));

vi.mock('../../../hooks/useDashboardData', () => ({
  useDashboardData: () => ({
    summary: null,
    debts: [],
    pending: [],
    obligations: [],
    loading: false,
    error: null,
    behaviorSummary: { totals: { discretionary: 0 } },
    behaviorSignals: [],
    reload: vi.fn(),
  }),
}));

test('renders dashboard hero question', () => {
  useAuthStore.setState({
    user: { id: 1, email: 'a', name: 'Alice', superAdmin: false, permissions: [] },
    accessToken: 'x',
    isAuthenticated: true,
    isLoading: false,
  });

  const view = render(
    <MemoryRouter>
      <AgentUIProvider>
        <DashboardPage />
      </AgentUIProvider>
    </MemoryRouter>,
  );

  expect(view.getByText(/Alice/)).toBeInTheDocument();
});
