import { createContext, useContext, useEffect, type Dispatch, type SetStateAction } from 'react';
import type { BreadcrumbItem } from '../../organisms/BreadcrumbTrail';

type AppLayoutContextValue = {
  setBreadcrumbs: Dispatch<SetStateAction<BreadcrumbItem[]>>;
};

export const AppLayoutContext = createContext<AppLayoutContextValue | null>(null);

export const useAppBreadcrumbs = (items: BreadcrumbItem[]) => {
  const context = useContext(AppLayoutContext);

  useEffect(() => {
    if (!context) return undefined;

    context.setBreadcrumbs(items);

    return () => {
      context.setBreadcrumbs([]);
    };
  }, [context, items]);
};
