import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { AgentUIProvider } from '../../../contexts/AgentUIContext';
import { useAuthStore } from '../../../store/authStore';
import { ProfilePage } from './ProfilePage';

vi.mock('../../molecules/AgentEventRenderer', () => ({
  AgentEventRenderer: () => null,
}));

vi.mock('../../molecules/CompletenessIndicator', () => ({
  CompletenessIndicator: () => null,
}));

test('renders profile title', () => {
  useAuthStore.setState({
    user: { id: 1, email: 'a', name: 'Alice', superAdmin: false, permissions: [] },
    accessToken: 'x',
    isAuthenticated: true,
    isLoading: false,
  });

  const view = render(
    <MemoryRouter>
      <AgentUIProvider>
        <ProfilePage />
      </AgentUIProvider>
    </MemoryRouter>,
  );

  expect(view.getByRole('heading', { name: 'Tu cuenta' })).toBeInTheDocument();
});
