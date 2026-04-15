import type { ReactNode } from 'react';
import { usePermission } from '../../../hooks/usePermission';
import type { PermissionSlug } from '../../../types/authorization.types';
export const PermissionGate=({permission,children,fallback=null}:{permission:PermissionSlug;children:ReactNode;fallback?:ReactNode;})=>{ const {can}=usePermission(); return <>{can(permission)?children:fallback}</>; };
