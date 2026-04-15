import { api, apiBaseUrl } from './api';
import type { AuthResponse, LoginCredentials, RegisterPayload } from '../types/auth.types';
import type { AuthUser } from '../types/authorization.types';

const mapMeResponse = (data: { data?: { id?: number | string; attributes?: Partial<AuthUser> & { superAdmin?: boolean; super_admin?: boolean } } }): AuthUser => ({
  id: Number(data.data?.id ?? data.data?.attributes?.id ?? 0),
  email: data.data?.attributes?.email ?? '',
  name: data.data?.attributes?.name ?? '',
  avatarUrl: data.data?.attributes?.avatarUrl ?? null,
  authProvider: data.data?.attributes?.authProvider ?? null,
  superAdmin: data.data?.attributes?.superAdmin ?? data.data?.attributes?.super_admin ?? false,
  permissions: data.data?.attributes?.permissions ?? [],
});

const mapAuthResponse = (data: { data?: { id?: number | string; attributes?: { name?: string; email?: string; avatar_url?: string | null; auth_provider?: string | null; permissions?: string[]; super_admin?: boolean } }; meta?: { access_token?: string; refresh_token?: string } }): AuthResponse => ({
  data: {
    id: data.data?.id,
    attributes: {
      name: data.data?.attributes?.name ?? '',
      email: data.data?.attributes?.email,
      avatar_url: data.data?.attributes?.avatar_url ?? null,
      auth_provider: data.data?.attributes?.auth_provider ?? null,
      permissions: data.data?.attributes?.permissions ?? [],
      super_admin: data.data?.attributes?.super_admin ?? false,
    },
  },
  meta: data.meta,
  tokens: {
    accessToken: data.meta?.access_token ?? '',
    refreshToken: data.meta?.refresh_token ?? '',
  },
});

export const authService={ async login(credentials:LoginCredentials):Promise<AuthResponse>{ const {data}=await api.post('/api/v1/auth/login',credentials); return mapAuthResponse(data as { data?: { id?: number | string; attributes?: { name?: string; email?: string; avatar_url?: string | null; auth_provider?: string | null; permissions?: string[]; super_admin?: boolean } }; meta?: { access_token?: string; refresh_token?: string } }); }, async register(payload:RegisterPayload):Promise<AuthResponse>{ const { passwordConfirmation, ...rest } = payload; const {data}=await api.post('/api/v1/auth/register',rest); return mapAuthResponse(data as { data?: { id?: number | string; attributes?: { name?: string; email?: string; avatar_url?: string | null; auth_provider?: string | null; permissions?: string[]; super_admin?: boolean } }; meta?: { access_token?: string; refresh_token?: string } }); }, async refresh(refreshToken:string,userId:number):Promise<AuthResponse>{ const {data}=await api.post('/api/v1/auth/refresh',{ user_id:userId, refresh_token:refreshToken }); return mapAuthResponse(data as { data?: { id?: number | string; attributes?: { name?: string; email?: string; avatar_url?: string | null; auth_provider?: string | null; permissions?: string[]; super_admin?: boolean } }; meta?: { access_token?: string; refresh_token?: string } }); }, async me():Promise<AuthUser>{ const {data}=await api.get('/api/v1/auth/me'); return mapMeResponse(data as { data?: { id?: number | string; attributes?: Partial<AuthUser> & { superAdmin?: boolean; super_admin?: boolean } } }); } };

export const getGoogleAuthUrl = (): string => new URL('/api/v1/auth/google', apiBaseUrl).toString();

export const startGoogleOAuth = (): void => {
  window.location.href = getGoogleAuthUrl();
};
