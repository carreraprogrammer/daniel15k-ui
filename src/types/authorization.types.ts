export type PermissionSlug = string;
export interface AuthUser { id:number; email:string; name:string; avatarUrl?:string | null; authProvider?:string | null; superAdmin:boolean; permissions:PermissionSlug[]; }
export interface Role { id:string; name:string; slug:string; description:string | null; active:boolean; permissions:PermissionSlug[]; }
export interface AssignRolePayload { roleSlug:string; expiresAt?:string; }
export interface RevokeRolePayload { roleSlug:string; }
