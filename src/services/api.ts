import axios from 'axios';
import { useAuthStore } from '../store/authStore';
export const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
export const api=axios.create({ baseURL: apiBaseUrl });
api.interceptors.request.use((config)=>{ const token=useAuthStore.getState().accessToken; if(token){ if(!config.headers) config.headers=new axios.AxiosHeaders(); config.headers.set('Authorization',`Bearer ${token}`); } return config; });

let refreshPromise: Promise<void> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
    const status = error.response?.status;
    const requestUrl = String(originalRequest?.url ?? '');
    const isAuthRefreshRequest = requestUrl.includes('/api/v1/auth/refresh');

    if (status !== 401 || !originalRequest || originalRequest._retry || isAuthRefreshRequest) {
      return Promise.reject(error);
    }

    const { accessToken, user, refreshToken, clearSession } = useAuthStore.getState();
    if (!accessToken || !user) {
      clearSession();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = refreshToken().finally(() => {
          refreshPromise = null;
        });
      }

      await refreshPromise;

      const nextToken = useAuthStore.getState().accessToken;
      if (nextToken) {
        if (!originalRequest.headers) {
          originalRequest.headers = new axios.AxiosHeaders();
        }
        originalRequest.headers.set('Authorization', `Bearer ${nextToken}`);
      }

      return api(originalRequest);
    } catch (refreshError) {
      clearSession();
      return Promise.reject(refreshError);
    }
  },
);
