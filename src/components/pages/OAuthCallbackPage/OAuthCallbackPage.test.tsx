import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { OAuthCallbackPage } from './OAuthCallbackPage';

const LocationProbe = () => <div>login screen</div>;

test('redirects to login when oauth callback succeeds', async () => {
  const view = render(
    <MemoryRouter initialEntries={['/auth/callback']}>
      <Routes>
        <Route path="/auth/callback" element={<OAuthCallbackPage />} />
        <Route path="/login" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );

  expect(await view.findByText('login screen')).toBeInTheDocument();
});

test('redirects to login with oauthError state when oauth callback fails', async () => {
  const StateProbe = () => {
    const location = useLocation() as { state?: { oauthError?: string } };
    return <div>{location.state?.oauthError ?? 'missing state'}</div>;
  };

  const view = render(
    <MemoryRouter initialEntries={['/auth/callback?error=access_denied&message=Google%20login%20failed']}>
      <Routes>
        <Route path="/auth/callback" element={<OAuthCallbackPage />} />
        <Route path="/login" element={<StateProbe />} />
      </Routes>
    </MemoryRouter>,
  );

  expect(await view.findByText('Google login failed')).toBeInTheDocument();
});
