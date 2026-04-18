import { IonRouterOutlet } from '@ionic/react';
import { Redirect, Route } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LoginPage } from '../components/pages/LoginPage/LoginPage';
import { RegisterPage } from '../components/pages/RegisterPage/RegisterPage';
import { DashboardPage } from '../components/pages/DashboardPage/DashboardPage';
import { ProfilePage } from '../components/pages/ProfilePage/ProfilePage';
import { NotFoundPage } from '../components/pages/NotFoundPage/NotFoundPage';
import { OAuthCallbackPage } from '../components/pages/OAuthCallbackPage';
import { TransactionsPage } from '../components/pages/TransactionsPage';
import { DebtsPage } from '../components/pages/DebtsPage';
import { RecurringObligationsPage } from '../components/pages/RecurringObligationsPage';
import { BudgetsPage } from '../components/pages/BudgetsPage';

const ProtectedRoute = ({
  component: Component,
  ...rest
}: {
  path: string;
  exact?: boolean;
  component: () => JSX.Element;
}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <Route
      {...rest}
      render={() => (isAuthenticated ? <Component /> : <Redirect to="/login" />)}
    />
  );
};

const GuestRoute = ({
  component: Component,
  ...rest
}: {
  path: string;
  exact?: boolean;
  component: () => JSX.Element;
}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <Route
      {...rest}
      render={() => (isAuthenticated ? <Redirect to="/dashboard" /> : <Component />)}
    />
  );
};

export const AppRouter = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <IonRouterOutlet>
      <Route
        exact
        path="/"
        render={() => <Redirect to={isAuthenticated ? '/dashboard' : '/login'} />}
      />
      <GuestRoute exact path="/login" component={LoginPage} />
      <GuestRoute exact path="/register" component={RegisterPage} />
      <Route exact path="/auth/callback" component={OAuthCallbackPage} />
      <ProtectedRoute exact path="/dashboard" component={DashboardPage} />
      <ProtectedRoute exact path="/transactions" component={TransactionsPage} />
      <ProtectedRoute exact path="/debts" component={DebtsPage} />
      <ProtectedRoute exact path="/recurring" component={RecurringObligationsPage} />
      <ProtectedRoute exact path="/budgets" component={BudgetsPage} />
      <ProtectedRoute exact path="/profile" component={ProfilePage} />
      <Route component={NotFoundPage} />
    </IonRouterOutlet>
  );
};
