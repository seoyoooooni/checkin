import { loadAuth } from './storage';
import type { Api, AttendanceRecord, AttendanceSession, CheckInResult, Course, LoginResult } from './types';
import { ApiError } from './types';

const BASE = '/api';

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const auth = loadAuth();
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(auth?.accessToken ? { Authorization: `Bearer ${auth.accessToken}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, '서버에 연결하지 못했어요');
  }
  if (!res.ok) {
    let message = `요청에 실패했어요 (${res.status})`;
    try {
      const data = (await res.json()) as { message?: string };
      if (data.message) message = data.message;
    } catch {}
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  try {
    return (await res.json()) as T;
  } catch {
    throw new ApiError(res.status, '서버 응답을 읽지 못했어요');
  }
}

export const httpApi: Api = {
  login: (number, password) => request<LoginResult>('POST', '/auth/login', { number, password }),
  getMyCourses: () => request<Course[]>('GET', '/me/courses'),
  getActiveSession: (courseId) =>
    request<AttendanceSession | null>('GET', `/courses/${courseId}/sessions/active`),
  startSession: (courseId, lateAfterMin) =>
    request<AttendanceSession>('POST', `/courses/${courseId}/sessions`, { lateAfterMin }),
  endSession: (sessionId) => request<AttendanceSession>('PATCH', `/sessions/${sessionId}`, { status: 'CLOSED' }),
  getSession: (sessionId) => request<{ session: AttendanceSession; course: Course }>('GET', `/sessions/${sessionId}`),
  getRecords: (sessionId) => request<AttendanceRecord[]>('GET', `/sessions/${sessionId}/records`),
  markAttendance: (sessionId, userId, status) =>
    request<void>('PUT', `/sessions/${sessionId}/records/${userId}`, { status, manual: true }),
  subscribeToken() {
    throw new Error('토큰 구독(STOMP)은 백엔드 연결 시 구현해야 해요. src/api/http.ts 참고');
  },
  checkIn: (token, deviceId) => request<CheckInResult>('POST', '/check-in', { token, deviceId }),
};
