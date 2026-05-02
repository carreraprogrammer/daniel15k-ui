export const LAST_AUTH_PATH_KEY = 'last_auth_path';

export const DEFAULT_AUTH_PATH = '/dashboard';

export const PROTECTED_PATHS = [
  '/dashboard',
  '/transactions',
  '/debts',
  '/planned-expenses',
  '/recurring',
  '/budgets',
  '/savings-goals',
  '/profile',
  '/quick',
];

export const getLastAuthPath = () => {
  const storedPath = localStorage.getItem(LAST_AUTH_PATH_KEY);

  return storedPath && PROTECTED_PATHS.includes(storedPath) ? storedPath : DEFAULT_AUTH_PATH;
};

export const rememberAuthPath = (pathname: string) => {
  if (PROTECTED_PATHS.includes(pathname)) {
    localStorage.setItem(LAST_AUTH_PATH_KEY, pathname);
  }
};
