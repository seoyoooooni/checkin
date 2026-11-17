import { loadAuth, saveAuth } from './storage';
import { subscribeStomp } from './stomp';
import type {
  Api,
  AttendanceRecord,
  AttendanceSession,
  CheckInResult,
  Course,
  JoinPreview,
  LoginResult,
  Student,
  TokenTick,
} from './types';
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
  if (res.status === 401 && !path.startsWith('/auth/')) {
    saveAuth(null);
    window.location.replace('/login');
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
  signup: (number, name, password) => request<LoginResult>('POST', '/auth/signup', { number, name, password }),
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
  subscribeToken: (sessionId, onTick, onError) => subscribeTicks(`/topic/sessions/${sessionId}/token`, onTick, onError),
  checkIn: (token, deviceId) => request<CheckInResult>('POST', '/check-in', { token, deviceId }),
  createCourse: (input) => request<Course>('POST', '/courses', input),
  getCourse: (courseId) => request<Course>('GET', `/courses/${courseId}`),
  openJoin: (courseId) => request<Course>('POST', `/courses/${courseId}/join/open`),
  closeJoin: (courseId) => request<Course>('POST', `/courses/${courseId}/join/close`),
  subscribeJoinToken: (courseId, onTick, onError) =>
    subscribeTicks(`/topic/courses/${courseId}/join-token`, onTick, onError),
  getStudents: (courseId) => request<Student[]>('GET', `/courses/${courseId}/students`),
  addStudent: (courseId, number) => request<Student>('POST', `/courses/${courseId}/students`, { number }),
  removeStudent: (courseId, userId) => request<void>('DELETE', `/courses/${courseId}/students/${userId}`),
  previewJoin: (token) => request<JoinPreview>('POST', '/enrollments/preview', { token }),
  joinCourse: (ticket) => request<Course>('POST', '/enrollments', { ticket }),
};

function subscribeTicks(destination: string, onTick: (tick: TokenTick) => void, onError?: (message: string) => void) {
  return subscribeStomp(
    destination,
    (body) => {
      try {
        onTick(JSON.parse(body) as TokenTick);
      } catch {}
    },
    onError,
  );
}
