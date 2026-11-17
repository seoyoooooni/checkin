import type { Api, AttendanceRecord, AttendanceSession, Course, User } from './types';

export const SAMPLE_USERS: Record<'PROFESSOR' | 'STUDENT', User> = {
  PROFESSOR: { id: 'prof-1', number: 'P2026001', name: '닉네임', role: 'PROFESSOR' },
  STUDENT: { id: 'stu-1', number: '202600001', name: '홍길동', role: 'STUDENT' },
};

const COURSE: Course = {
  id: 'course-1',
  name: '웹프로그래밍',
  section: 'A',
  semester: '2026-2',
  professorName: '닉네임',
  room: '공학관 405호',
  schedule: '월 10:00–12:50',
  studentCount: 3,
};

const RECORDS: AttendanceRecord[] = [
  { userId: 'stu-2', studentNumber: '202600002', name: '김민수', status: 'PRESENT', submittedAt: null, manual: false },
  { userId: 'stu-3', studentNumber: '202600003', name: '이서연', status: 'LATE', submittedAt: null, manual: false },
  { userId: 'stu-4', studentNumber: '202600004', name: '박지훈', status: 'ABSENT', submittedAt: null, manual: false },
];

const TOKEN = '123456';

let session: AttendanceSession | null = null;
let records = RECORDS.map((r) => ({ ...r }));

const wait = (ms = 200) => new Promise((r) => setTimeout(r, ms));
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

export const sampleApi: Api = {
  async login(number) {
    await wait();
    const user = number.trim().toUpperCase().startsWith('P') ? SAMPLE_USERS.PROFESSOR : SAMPLE_USERS.STUDENT;
    return { accessToken: '', user };
  },

  async getMyCourses() {
    await wait();
    return [COURSE];
  },

  async getActiveSession() {
    await wait(100);
    return session?.status === 'OPEN' ? session : null;
  },

  async startSession(courseId, lateAfterMin) {
    await wait();
    session = {
      id: 'session-1',
      courseId,
      startedAt: minutesAgo(lateAfterMin + 2),
      endedAt: null,
      lateAfterMin,
      slotSeconds: 5,
      status: 'OPEN',
    };
    records = RECORDS.map((r) => ({
      ...r,
      submittedAt: r.status === 'PRESENT' ? minutesAgo(lateAfterMin + 1) : r.status === 'LATE' ? minutesAgo(0) : null,
    }));
    return session;
  },

  async endSession() {
    await wait();
    if (!session) throw new Error('출석 세션이 없어요');
    session = { ...session, status: 'CLOSED', endedAt: new Date().toISOString() };
    return session;
  },

  async getSession() {
    await wait(100);
    if (!session) throw new Error('출석 세션이 없어요');
    return { session, course: COURSE };
  },

  async getRecords() {
    await wait(100);
    return records.map((r) => ({ ...r }));
  },

  async markAttendance(_sessionId, userId, status) {
    await wait();
    records = records.map((r) =>
      r.userId === userId
        ? { ...r, status, manual: true, submittedAt: status === 'ABSENT' ? null : new Date().toISOString() }
        : r,
    );
  },

  subscribeToken(_sessionId, onTick) {
    const slotMs = (session?.slotSeconds ?? 5) * 1000;
    let last = -1;
    const tick = () => {
      const slot = Math.floor(Date.now() / slotMs);
      if (slot !== last) {
        last = slot;
        onTick({ token: TOKEN, slot, expiresAt: (slot + 1) * slotMs });
      }
    };
    tick();
    const id = window.setInterval(tick, 200);
    return () => clearInterval(id);
  },

  async checkIn() {
    await wait(300);
    return { code: 'PRESENT', courseName: COURSE.name, submittedAt: new Date().toISOString() };
  },
};
