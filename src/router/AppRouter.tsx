import { IonContent, IonIcon, IonLabel, IonPage, IonRouterOutlet, IonTabBar, IonTabButton, IonTabs } from '@ionic/react';
import { lazy, Suspense, type ComponentType } from 'react';
import { Redirect, Route, useLocation } from 'react-router-dom';
import {
  calendarOutline,
  cardOutline,
  homeOutline,
  pieChartOutline,
  swapHorizontalOutline,
} from 'ionicons/icons';
import { useAuthStore } from '../store/authStore';
import { Spinner } from '../components/atoms/Spinner';
import { getLastAuthPath } from '../utils/navigation';
import styles from './AppRouter.module.css';

const LoginPage = lazy(() => import('../components/pages/LoginPage/LoginPage').then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import('../components/pages/RegisterPage/RegisterPage').then((module) => ({ default: module.RegisterPage })));
const DashboardPage = lazy(() => import('../components/pages/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const ProfilePage = lazy(() => import('../components/pages/ProfilePage').then((module) => ({ default: module.ProfilePage })));
const NotFoundPage = lazy(() => import('../components/pages/NotFoundPage/NotFoundPage').then((module) => ({ default: module.NotFoundPage })));
const OAuthCallbackPage = lazy(() => import('../components/pages/OAuthCallbackPage').then((module) => ({ default: module.OAuthCallbackPage })));
const TransactionsPage = lazy(() => import('../components/pages/TransactionsPage').then((module) => ({ default: module.TransactionsPage })));
const DebtsPage = lazy(() => import('../components/pages/DebtsPage').then((module) => ({ default: module.DebtsPage })));
const PlannedExpensesPage = lazy(() => import('../components/pages/PlannedExpensesPage').then((module) => ({ default: module.PlannedExpensesPage })));
const RecurringObligationsPage = lazy(() => import('../components/pages/RecurringObligationsPage').then((module) => ({ default: module.RecurringObligationsPage })));
const BudgetsPage = lazy(() => import('../components/pages/BudgetsPage').then((module) => ({ default: module.BudgetsPage })));
const SavingsGoalsPage = lazy(() => import('../components/pages/SavingsGoalsPage').then((module) => ({ default: module.SavingsGoalsPage })));
const QuickCapturePage = lazy(() => import('../components/pages/QuickCapturePage').then((module) => ({ default: module.QuickCapturePage })));

const RouteFallback = () => (
  <IonPage>
    <IonContent>
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100%', padding: 'var(--space-6)' }}>
        <Spinner size="lg" />
      </div>
    </IonContent>
  </IonPage>
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
      render={() => (isAuthenticated ? <Redirect to={getLastAuthPath()} /> : <Component />)}
    />
  );
};

const RootRedirect = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return <Redirect to={isAuthenticated ? getLastAuthPath() : '/login'} />;
};

const TAB_ITEMS = [
  { tab: 'dashboard', to: '/dashboard', label: 'Dashboard', icon: homeOutline },
  { tab: 'transactions', to: '/transactions', label: 'Movimientos', icon: swapHorizontalOutline },
  { tab: 'budgets', to: '/budgets', label: 'Presupuesto', icon: pieChartOutline },
  { tab: 'debts', to: '/debts', label: 'Deudas', icon: cardOutline },
  { tab: 'plans', to: '/planned-expenses', label: 'Planes', icon: calendarOutline },
];

const TAB_PATHS = TAB_ITEMS.map((item) => item.to);
const AUTH_PATHS = [
  ...TAB_PATHS,
  '/planned-expenses',
  '/recurring',
  '/profile',
  '/quick',
];

export const AppRouter = () => {
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const showTabs = isAuthenticated && AUTH_PATHS.includes(location.pathname);

  return (
    <IonTabs className={styles.tabsRoot}>
      <Suspense fallback={<RouteFallback />}>
        <IonRouterOutlet animated={false}>
          <Route exact path="/" component={RootRedirect} />
          <GuestRoute exact path="/login" component={LoginPage} />
          <GuestRoute exact path="/register" component={RegisterPage} />
          <Route exact path="/auth/callback" component={OAuthCallbackPage} />
          <ProtectedRoute exact path="/dashboard" component={DashboardPage} />
          <ProtectedRoute exact path="/transactions" component={TransactionsPage} />
          <ProtectedRoute exact path="/debts" component={DebtsPage} />
          <ProtectedRoute exact path="/planned-expenses" component={PlannedExpensesPage} />
          <ProtectedRoute exact path="/recurring" component={RecurringObligationsPage} />
          <ProtectedRoute exact path="/budgets" component={BudgetsPage} />
          <ProtectedRoute exact path="/savings-goals" component={SavingsGoalsPage} />
          <ProtectedRoute exact path="/profile" component={ProfilePage} />
          <ProtectedRoute exact path="/quick" component={QuickCapturePage} />
          <Route component={NotFoundPage} />
        </IonRouterOutlet>
      </Suspense>

      {showTabs ? (
        <IonTabBar slot="bottom" className={styles.tabBar}>
          {TAB_ITEMS.map((item) => (
            <IonTabButton
              key={item.tab}
              tab={item.tab}
              href={item.to}
              className={location.pathname === item.to ? styles.tabButtonActive : undefined}
              aria-label={item.label}
            >
              <IonIcon aria-hidden="true" icon={item.icon} />
              <IonLabel>{item.label}</IonLabel>
            </IonTabButton>
          ))}
        </IonTabBar>
      ) : null}
    </IonTabs>
  );
};
