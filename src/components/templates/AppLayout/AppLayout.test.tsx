import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { AgentUIProvider } from '../../../contexts/AgentUIContext';
import { useAuthStore } from '../../../store/authStore';
import { AppLayout } from './AppLayout';

vi.mock('../../molecules/AgentEventRenderer', () => ({
  AgentEventRenderer: () => null,
}));

vi.mock('../../molecules/CompletenessIndicator', () => ({
  CompletenessIndicator: () => null,
}));

test('renders dashboard navigation', () => {
  useAuthStore.setState({
    user: { id: 1, email: 'a', name: 'Alice', superAdmin: true, permissions: [] },
    accessToken: 'x',
    isAuthenticated: true,
    isLoading: false,
  });

  const view = render(
    <MemoryRouter>
      <AgentUIProvider>
        <AppLayout title="Home">
          <div>Body</div>
        </AppLayout>
      </AgentUIProvider>
    </MemoryRouter>,
  );

  expect(view.getAllByText('Dashboard').length).toBeGreaterThan(0);
});
