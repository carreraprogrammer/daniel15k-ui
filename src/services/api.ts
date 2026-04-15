import axios from 'axios';
import { useAuthStore } from '../store/authStore';
export const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
export const api=axios.create({ baseURL: apiBaseUrl });
api.interceptors.request.use((config)=>{ const token=useAuthStore.getState().accessToken; if(token){ if(!config.headers) config.headers=new axios.AxiosHeaders(); config.headers.set('Authorization',`Bearer ${token}`); } return config; });
// TODO: specs/api-contract.md is missing, so exact refresh/error handling is intentionally limited.
