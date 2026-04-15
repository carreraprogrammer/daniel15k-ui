import { create } from 'zustand';
import { jwtDecode } from 'jwt-decode';
import type { AuthUser, PermissionSlug } from '../types/authorization.types';
import type { AuthResponse, JwtPayload, LoginCredentials, RegisterPayload } from '../types/auth.types';
import { authService } from '../services/authService';
interface AuthState { user:AuthUser|null; accessToken:string|null; isAuthenticated:boolean; isLoading:boolean; login:(credentials:LoginCredentials)=>Promise<void>; register:(payload:RegisterPayload)=>Promise<void>; hydrateAuth:(response:AuthResponse|RawAuthEnvelope)=>void; logout:()=>Promise<void>; refreshToken:()=>Promise<void>; setUser:(user:AuthUser)=>void; hasPermission:(slug:PermissionSlug)=>boolean; isSuperAdmin:()=>boolean; }
const RFT_KEY='rft';
const AT_KEY='at';
const USER_KEY='auth_user';
// Security note: refresh tokens stored in localStorage are accessible to any injected script (XSS).
// Prefer httpOnly cookies if the backend supports them.
type RawAuthEnvelope = {
  data?: {
    id?: number | string;
    attributes?: {
      name?: string;
      email?: string;
      avatar_url?: string | null;
      auth_provider?: string | null;
      permissions?: string[];
      super_admin?: boolean;
    };
  };
  meta?: {
    access_token?: string;
    refresh_token?: string;
  };
};

const getStoredAccessToken=():string|null=>localStorage.getItem(AT_KEY);
const getStoredUser=():AuthUser|null=>{ const raw=localStorage.getItem(USER_KEY); if(!raw) return null; try { return JSON.parse(raw) as AuthUser; } catch { localStorage.removeItem(USER_KEY); return null; } };
const normalizeAuthResponse=(response:AuthResponse|RawAuthEnvelope):AuthResponse=>'tokens' in response ? response : { data:{ id:response.data?.id, attributes:{ name:response.data?.attributes?.name ?? '', email:response.data?.attributes?.email, avatar_url:response.data?.attributes?.avatar_url ?? null, auth_provider:response.data?.attributes?.auth_provider ?? null, permissions:response.data?.attributes?.permissions ?? [], super_admin:response.data?.attributes?.super_admin ?? false } }, meta:response.meta, tokens:{ accessToken:response.meta?.access_token ?? '', refreshToken:response.meta?.refresh_token ?? '' } };
const mapUser=(response:AuthResponse,currentUser:AuthUser|null):AuthUser=>{ const accessToken=response.tokens.accessToken; const payload=jwtDecode<JwtPayload>(accessToken); return { id:payload.user_id,email:response.data.attributes.email ?? currentUser?.email ?? payload.email,name:response.data.attributes.name || currentUser?.name || payload.email,avatarUrl:response.data.attributes.avatar_url ?? currentUser?.avatarUrl ?? null,authProvider:response.data.attributes.auth_provider ?? currentUser?.authProvider ?? null,superAdmin:payload.super_admin,permissions:payload.permissions};};
const applyAuthResponse=(incoming:AuthResponse|RawAuthEnvelope,set:(partial:Partial<AuthState>)=>void,currentUser:AuthUser|null)=>{ const response=normalizeAuthResponse(incoming); console.log('[authStore] hydrate:start',{ incoming, normalized:response, hasAccessToken:Boolean(response.tokens.accessToken), hasRefreshToken:Boolean(response.tokens.refreshToken) }); const user=mapUser(response,currentUser); console.log('[authStore] hydrate:decodedUser',user); localStorage.setItem(RFT_KEY,response.tokens.refreshToken); localStorage.setItem(AT_KEY,response.tokens.accessToken); localStorage.setItem(USER_KEY,JSON.stringify(user)); set({accessToken:response.tokens.accessToken,isAuthenticated:true,user,isLoading:false}); console.log('[authStore] hydrate:stateApplied',{ accessToken:response.tokens.accessToken, isAuthenticated:true, user }); };
const initialAccessToken=getStoredAccessToken();
const initialUser=getStoredUser();
export const useAuthStore=create<AuthState>((set,get)=>({ user:initialUser,accessToken:initialAccessToken,isAuthenticated:Boolean(initialAccessToken&&initialUser),isLoading:false, async login(credentials){ set({isLoading:true}); try { const response=await authService.login(credentials); applyAuthResponse(response,set,get().user); } catch(error){ set({isLoading:false}); throw error;} }, async register(payload){ set({isLoading:true}); try { const response=await authService.register(payload); applyAuthResponse(response,set,get().user); } catch(error){ set({isLoading:false}); throw error; } }, hydrateAuth(response){ applyAuthResponse(response,set,get().user); }, async logout(){ localStorage.removeItem(RFT_KEY); localStorage.removeItem(AT_KEY); localStorage.removeItem(USER_KEY); set({user:null,accessToken:null,isAuthenticated:false}); }, async refreshToken(){ const refreshToken=localStorage.getItem(RFT_KEY); const userId=get().user?.id; if(!refreshToken || !userId) return; const response=await authService.refresh(refreshToken,userId); applyAuthResponse(response,set,get().user); }, setUser(user){ localStorage.setItem(USER_KEY,JSON.stringify(user)); set({user}); }, hasPermission(slug){ const {user}=get(); if(!user) return false; if(user.superAdmin) return true; return user.permissions.includes(slug); }, isSuperAdmin(){ return get().user?.superAdmin ?? false; } }));
