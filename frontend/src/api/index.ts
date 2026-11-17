import { httpApi } from './http';
import { sampleApi, SAMPLE_USERS } from './sample';
import type { Api, User } from './types';

export const USE_SAMPLE = false;

export const api: Api = USE_SAMPLE ? sampleApi : httpApi;

export function previewUser(role: 'PROFESSOR' | 'STUDENT'): User {
  return USE_SAMPLE ? SAMPLE_USERS[role] : { id: '', number: '', name: '', role };
}

export * from './types';
