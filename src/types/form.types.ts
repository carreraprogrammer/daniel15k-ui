export interface SelectOption { label:string; value:string | number; disabled?:boolean; }
export type FieldType = 'text'|'email'|'password'|'tel'|'number'|'textarea'|'select'|'checkbox'|'date'|'datetime-local'|'hidden';
export interface FieldSchema { name:string; label?:string; type:FieldType; placeholder?:string; required?:boolean; rows?:number; options?:SelectOption[]; validations?:{ min_length?:number; max_length?:number; }; }
export interface FormSchema { slug:string; title:string; submit_endpoint:string; submit_method:'POST'|'PATCH'|'DELETE'|'GET'; fields:FieldSchema[]; }
export type FormValues = Record<string, unknown>;
export interface ApiEnvelope<T> { data:T; meta?:Record<string, unknown>; errors?:Record<string,string[]>; }