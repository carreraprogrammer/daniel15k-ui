import type { AuthUser } from './authorization.types';
export interface LoginCredentials { email:string; password:string; }
export interface RegisterPayload { name:string; email:string; password:string; passwordConfirmation:string; }
export interface AuthTokens { accessToken:string; refreshToken:string; }
export interface AuthResponse { data:{ id?:string | number; attributes:{ name:string; email?:string; avatar_url?:string | null; auth_provider?:string | null; super_admin?:boolean; permissions?:string[] } }; meta?:Record<string, unknown>; tokens:AuthTokens; user?:AuthUser; }
export interface JwtPayload { user_id:number; email:string; super_admin:boolean; permissions:string[]; jti:string; exp:number; }
