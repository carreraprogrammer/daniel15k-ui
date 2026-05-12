import { useIonViewWillEnter, useIonViewWillLeave } from '@ionic/react';
import { createContext, useContext, useEffect, useRef, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import type { BreadcrumbItem } from '../../organisms/BreadcrumbTrail';

export type AppToolbarAction = {
  key: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  badgeCount?: number;
  active?: boolean;
};

export type AppToolbarConfig = {
  title: string;
  subtitle?: string;
  searchPlaceholder?: string;
  searchValue?: string;
  resultLabel?: string;
  onSearchChange?: (value: string) => void;
  actions?: AppToolbarAction[];
};

type AppLayoutContextValue = {
  setBreadcrumbs: Dispatch<SetStateAction<BreadcrumbItem[]>>;
  setToolbar: Dispatch<SetStateAction<AppToolbarConfig | null>>;
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

export const useAppToolbar = (toolbar: AppToolbarConfig | null) => {
  const context = useContext(AppLayoutContext);
  const contextRef = useRef(context);
  const toolbarRef = useRef(toolbar);

  useEffect(() => {
    contextRef.current = context;
    toolbarRef.current = toolbar;
  }, [context, toolbar]);

  useIonViewWillEnter(() => {
    contextRef.current?.setToolbar(toolbarRef.current);
  });

  useIonViewWillLeave(() => {
    contextRef.current?.setToolbar(null);
  });

  useEffect(() => {
    if (!context) return undefined;

    context.setToolbar(toolbar);

    return () => {
      context.setToolbar(null);
    };
  }, [context, toolbar]);
};
