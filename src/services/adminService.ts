import { api } from './api';

export interface AdminAccount {
  id: number;
  user_id: number;
  name: string;
  email: string;
}

export const adminService = {
  getAccounts: () => api.get<{ data: AdminAccount[] }>('/api/v1/admin/accounts'),
  impersonate: (accountId: number) =>
    api.post<{ data: { access_token: string; account: AdminAccount } }>(
      '/api/v1/admin/impersonate',
      { account_id: accountId },
    ),
};
