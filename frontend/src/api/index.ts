import { httpApi } from './http';
import { sampleApi, SAMPLE_USERS } from './sample';
import type { Api, User } from './types';

/** TODO: 백엔드 붙이면 false로 바꾸고 sample.ts 삭제 */
export const USE_SAMPLE = true;

export const api: Api = USE_SAMPLE ? sampleApi : httpApi;

/** 임시 바로가기용 사용자 */
export function previewUser(role: 'PROFESSOR' | 'STUDENT'): User {
  return USE_SAMPLE ? SAMPLE_USERS[role] : { id: '', number: '', name: '', role };
}

export * from './types';
