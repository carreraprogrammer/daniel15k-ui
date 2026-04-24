import { IonRouterOutlet } from '@ionic/react';
import { lazy, Suspense, type ComponentType } from 'react';
import { Redirect, Route } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Spinner } from '../components/atoms/Spinner/Spinner';

const LoginPage = lazy(() => import('../components/pages/LoginPage/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('../components/pages/RegisterPage/RegisterPage').then(m => ({ default: m.RegisterPage })));
const DashboardPage = lazy(() => import('../components/pages/DashboardPage/DashboardPage').then(m => ({ default: m.DashboardPage })));
const ProfilePage = lazy(() => import('../components/pages/ProfilePage/ProfilePage').then(m => ({ default: m.ProfilePage })));
const NotFoundPage = lazy(() => import('../components/pages/NotFoundPage/NotFoundPage').then(m => ({ default: m.NotFoundPage })));
const OAuthCallbackPage = lazy(() => import('../components/pages/OAuthCallbackPage').then(m => ({ default: m.OAuthCallbackPage })));
const TransactionsPage = lazy(() => import('../components/pages/TransactionsPage').then(m => ({ default: m.TransactionsPage })));
const DebtsPage = lazy(() => import('../components/pages/DebtsPage').then(m => ({ default: m.DebtsPage })));
const PlannedExpensesPage = lazy(() => import('../components/pages/PlannedExpensesPage').then(m => ({ default: m.PlannedExpensesPage })));
const RecurringObligationsPage = lazy(() => import('../components/pages/RecurringObligationsPage').then(m => ({ default: m.RecurringObligationsPage })));
const BudgetsPage = lazy(() => import('../components/pages/BudgetsPage').then(m => ({ default: m.BudgetsPage })));

const PageFallback = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '200px' }}>
    <Spinner size="lg" />
  </div>
);

const ProtectedRoute = ({
  component: Component,
  ...rest
}: {
  path: string;
  exact?: boolean;
  component: ComponentType;
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
  component: ComponentType;
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
    <Suspense fallback={<PageFallback />}>
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
        <ProtectedRoute exact path="/planned-expenses" component={PlannedExpensesPage} />
        <ProtectedRoute exact path="/recurring" component={RecurringObligationsPage} />
        <ProtectedRoute exact path="/budgets" component={BudgetsPage} />
        <ProtectedRoute exact path="/profile" component={ProfilePage} />
        <Route component={NotFoundPage} />
      </IonRouterOutlet>
    </Suspense>
  );
};
