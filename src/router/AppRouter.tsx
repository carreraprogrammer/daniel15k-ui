import { IonRouterOutlet } from '@ionic/react';
import type { ComponentType } from 'react';
import { Redirect, Route, Switch, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { AppLayout } from '../components/templates/AppLayout';
import { LoginPage } from '../components/pages/LoginPage/LoginPage';
import { RegisterPage } from '../components/pages/RegisterPage/RegisterPage';
import { LandingPage } from '../components/pages/LandingPage';
import { DashboardContent } from '../components/pages/DashboardPage/DashboardPage';
import { ProfileContent } from '../components/pages/ProfilePage/ProfilePage';
import { NotFoundPage } from '../components/pages/NotFoundPage/NotFoundPage';
import { OAuthCallbackPage } from '../components/pages/OAuthCallbackPage';
import { TransactionsContent } from '../components/pages/TransactionsPage';
import { DebtsContent } from '../components/pages/DebtsPage';
import { PlannedExpensesContent } from '../components/pages/PlannedExpensesPage';
import { RecurringObligationsContent } from '../components/pages/RecurringObligationsPage';
import { BudgetsContent } from '../components/pages/BudgetsPage';
import { SavingsGoalsContent } from '../components/pages/SavingsGoalsPage';
import { QuickCapturePage } from '../components/pages/QuickCapturePage';

const INTERNAL_ROUTES = [
  { path: '/dashboard', title: 'Dashboard', component: DashboardContent },
  { path: '/transactions', title: 'Transacciones', component: TransactionsContent },
  { path: '/debts', title: 'Deudas', component: DebtsContent },
  { path: '/planned-expenses', title: 'Planeados', component: PlannedExpensesContent },
  { path: '/recurring', title: 'Recurrentes', component: RecurringObligationsContent },
  { path: '/budgets', title: 'Presupuestos', component: BudgetsContent },
  { path: '/savings-goals', title: 'Metas', component: SavingsGoalsContent },
  { path: '/profile', title: 'Mi perfil', component: ProfileContent },
] satisfies Array<{ path: string; title: string; component: ComponentType }>;

const INTERNAL_PATHS = INTERNAL_ROUTES.map((route) => route.path);

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

const InternalShell = () => {
  const location = useLocation();
  const activeRoute = INTERNAL_ROUTES.find((route) => route.path === location.pathname) ?? INTERNAL_ROUTES[0];

  return (
    <AppLayout title={activeRoute.title}>
      <Switch>
        {INTERNAL_ROUTES.map(({ path, component: Component }) => (
          <Route key={path} exact path={path} component={Component} />
        ))}
      </Switch>
    </AppLayout>
  );
};

const ProtectedShellRoute = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <Route
      path={INTERNAL_PATHS}
      render={() => (isAuthenticated ? <InternalShell /> : <Redirect to="/login" />)}
    />
  );
};

export const AppRouter = () => {
  return (
    <IonRouterOutlet animated={false}>
      <Route exact path="/" component={LandingPage} />
      <GuestRoute exact path="/login" component={LoginPage} />
      <GuestRoute exact path="/register" component={RegisterPage} />
      <Route exact path="/auth/callback" component={OAuthCallbackPage} />
      <ProtectedShellRoute />
      <ProtectedRoute exact path="/quick" component={QuickCapturePage} />
      <Route component={NotFoundPage} />
    </IonRouterOutlet>
  );
};
