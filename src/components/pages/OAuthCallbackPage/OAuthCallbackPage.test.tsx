import { render } from '@testing-library/react';
import { MemoryRouter, Route, Switch, useLocation } from 'react-router-dom';
import { OAuthCallbackPage } from './OAuthCallbackPage';

const LocationProbe = () => <div>login screen</div>;

test('redirects to login when oauth callback succeeds', async () => {
  const view = render(
    <MemoryRouter initialEntries={['/auth/callback']}>
      <Switch>
        <Route path="/auth/callback" component={OAuthCallbackPage} />
        <Route path="/login" component={LocationProbe} />
      </Switch>
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
      <Switch>
        <Route path="/auth/callback" component={OAuthCallbackPage} />
        <Route path="/login" component={StateProbe} />
      </Switch>
    </MemoryRouter>,
  );

  expect(await view.findByText('Google login failed')).toBeInTheDocument();
});
