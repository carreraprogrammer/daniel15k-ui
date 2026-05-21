import { IonIcon, IonLabel, IonRouterOutlet, IonTabBar, IonTabButton, IonTabs } from '@ionic/react';
import { useEffect, type ComponentType } from 'react';
import { Redirect, Route, useLocation } from 'react-router-dom';
import {
  calendarOutline,
  cardOutline,
  homeOutline,
  pieChartOutline,
  repeatOutline,
  swapHorizontalOutline,
} from 'ionicons/icons';
import { useAuthStore } from '../store/authStore';
import { LoginPage } from '../components/pages/LoginPage/LoginPage';
import { RegisterPage } from '../components/pages/RegisterPage/RegisterPage';
import { DashboardPage } from '../components/pages/DashboardPage';
import { ProfilePage } from '../components/pages/ProfilePage';
import { NotFoundPage } from '../components/pages/NotFoundPage/NotFoundPage';
import { OAuthCallbackPage } from '../components/pages/OAuthCallbackPage';
import { TransactionsPage } from '../components/pages/TransactionsPage';
import { DebtsPage } from '../components/pages/DebtsPage';
import { PlannedExpensesPage } from '../components/pages/PlannedExpensesPage';
import { RecurringObligationsPage } from '../components/pages/RecurringObligationsPage';
import { BudgetsPage } from '../components/pages/BudgetsPage';
import { BudgetDetailPage } from '../components/pages/BudgetDetailPage/BudgetDetailPage';
import { NightAnalysisDetailPage } from '../components/pages/NightAnalysisDetailPage/NightAnalysisDetailPage';
import { MonthlyInsightDetailPage } from '../components/pages/MonthlyInsightDetailPage/MonthlyInsightDetailPage';
import { SavingsGoalsPage } from '../components/pages/SavingsGoalsPage';
import { QuickCapturePage } from '../components/pages/QuickCapturePage';
import { getLastAuthPath } from '../utils/navigation';
import styles from './AppRouter.module.css';

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
  { tab: 'recurring', to: '/recurring', label: 'Recurrentes', icon: repeatOutline },
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
  const showTabs = isAuthenticated && (AUTH_PATHS.includes(location.pathname) || location.pathname.startsWith('/budgets/'));

  useEffect(() => {
    const root = document.documentElement;
    const tabBar = document.querySelector('[data-app-tabbar="true"]');

    if (!showTabs || !(tabBar instanceof HTMLElement)) {
      root.style.setProperty('--app-viewport-tabbar-height', '0px');
      return undefined;
    }

    const syncTabBarHeight = () => {
      root.style.setProperty('--app-viewport-tabbar-height', `${tabBar.getBoundingClientRect().height}px`);
    };

    syncTabBarHeight();
    window.addEventListener('resize', syncTabBarHeight);

    if (typeof ResizeObserver === 'undefined') {
      return () => {
        window.removeEventListener('resize', syncTabBarHeight);
        root.style.setProperty('--app-viewport-tabbar-height', '0px');
      };
    }

    const observer = new ResizeObserver(syncTabBarHeight);
    observer.observe(tabBar);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', syncTabBarHeight);
      root.style.setProperty('--app-viewport-tabbar-height', '0px');
    };
  }, [showTabs]);

  return (
    <IonTabs className={styles.tabsRoot}>
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
        <ProtectedRoute exact path="/gaveta/:categoryType" component={BudgetDetailPage} />
        <ProtectedRoute exact path="/analisis/:date" component={NightAnalysisDetailPage} />
        <ProtectedRoute exact path="/planes/:year/:month" component={MonthlyInsightDetailPage} />
        <ProtectedRoute exact path="/budgets/:year/:month" component={BudgetsPage} />
        <ProtectedRoute exact path="/savings-goals" component={SavingsGoalsPage} />
        <ProtectedRoute exact path="/profile" component={ProfilePage} />
        <ProtectedRoute exact path="/quick" component={QuickCapturePage} />
        <Route component={NotFoundPage} />
      </IonRouterOutlet>

      {showTabs ? (
        <IonTabBar slot="bottom" className={styles.tabBar} data-app-tabbar="true">
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
