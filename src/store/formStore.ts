import { create } from 'zustand';
import type { FormSchema } from '../types/form.types';
import { formService } from '../services/formService';
interface FormState { schemas:Record<string,FormSchema>; isLoading:boolean; error:string|null; fetchSchema:(slug:string)=>Promise<FormSchema>; }
export const useFormStore=create<FormState>((set,get)=>({ schemas:{}, isLoading:false, error:null, async fetchSchema(slug){ const existing=get().schemas[slug]; if(existing) return existing; set({isLoading:true,error:null}); try { const schema=await formService.fetchSchema(slug); set((state)=>({schemas:{...state.schemas,[slug]:schema},isLoading:false})); return schema; } catch(error){ set({error:error instanceof Error ? error.message : 'Unknown error',isLoading:false}); throw error; } } }));