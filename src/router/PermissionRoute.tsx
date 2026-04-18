import type { ReactNode } from 'react';
import { Redirect } from 'react-router-dom';
import { usePermission } from '../hooks/usePermission';
import type { PermissionSlug } from '../types/authorization.types';

export const PermissionRoute = ({
  permission,
  children,
  redirectTo = '/dashboard',
}: {
  permission: PermissionSlug;
  children: ReactNode;
  redirectTo?: string;
}) => {
  const { can } = usePermission();
  return can(permission) ? <>{children}</> : <Redirect to={redirectTo} />;
};
