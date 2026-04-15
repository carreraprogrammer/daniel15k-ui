import { api } from './api';
import type { ApiEnvelope, FormSchema, FormValues } from '../types/form.types';

type JsonApiResource<T> = {
  id: string;
  type: string;
  attributes: T;
};

const normalizeSchema = (payload: ApiEnvelope<FormSchema | JsonApiResource<FormSchema>>): FormSchema => {
  const resource = payload.data;

  if ('attributes' in resource) {
    return resource.attributes;
  }

  return resource;
};

export const formService={ async fetchSchema(slug:string):Promise<FormSchema>{ const {data}=await api.get(`/api/v1/forms/${slug}`); return normalizeSchema(data as ApiEnvelope<FormSchema | JsonApiResource<FormSchema>>); }, async submit(schema:FormSchema,values:FormValues):Promise<ApiEnvelope<Record<string,unknown>>>{ const method=schema.submit_method.toLowerCase() as 'post'|'patch'|'get'|'delete'; const {data}=await api.request({ url:schema.submit_endpoint, method, data: values }); return data as ApiEnvelope<Record<string,unknown>>; } };
