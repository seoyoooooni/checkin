export type Role = 'PROFESSOR' | 'STUDENT' | 'ADMIN';

export interface User {
  id: string;
  number: string;
  name: string;
  role: Role;
}

export interface Course {
  id: string;
  name: string;
  section: string;
  semester: string;
  professorName: string;
  room: string;
  schedule: string;
  studentCount: number;
  joinOpen?: boolean;
}

export interface CourseInput {
  name: string;
  section: string;
  semester: string;
  room: string;
  schedule: string;
}

export interface Student {
  userId: string;
  number: string;
  name: string;
}

export type JoinPreviewCode = 'OK' | 'ALREADY_ENROLLED' | 'INVALID_TOKEN';

export interface JoinPreview {
  code: JoinPreviewCode;
  ticket?: string;
  course?: Course;
}

export type SessionStatus = 'OPEN' | 'CLOSED';

export interface AttendanceSession {
  id: string;
  courseId: string;
  startedAt: string;
  endedAt: string | null;
  lateAfterMin: number;
  slotSeconds: number;
  status: SessionStatus;
}

export type AttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT' | 'SUSPICIOUS';
export type ManualStatus = Exclude<AttendanceStatus, 'SUSPICIOUS'>;

export interface AttendanceRecord {
  userId: string;
  studentNumber: string;
  name: string;
  status: AttendanceStatus;
  submittedAt: string | null;
  manual: boolean;
}

export type CheckInCode =
  | 'PRESENT'
  | 'LATE'
  | 'TOKEN_EXPIRED'
  | 'INVALID_TOKEN'
  | 'DUPLICATE'
  | 'NOT_ENROLLED'
  | 'UNREGISTERED_DEVICE'
  | 'SESSION_CLOSED';

export interface CheckInResult {
  code: CheckInCode;
  courseName?: string;
  submittedAt?: string;
}

export interface TokenTick {
  token: string;
  slot: number;
  expiresAt: number;
}

export interface LoginResult {
  accessToken: string;
  user: User;
}

export interface Api {
  login(number: string, password: string): Promise<LoginResult>;
  signup(number: string, name: string, password: string): Promise<LoginResult>;
  getMyCourses(): Promise<Course[]>;
  getActiveSession(courseId: string): Promise<AttendanceSession | null>;
  startSession(courseId: string, lateAfterMin: number): Promise<AttendanceSession>;
  endSession(sessionId: string): Promise<AttendanceSession>;
  getSession(sessionId: string): Promise<{ session: AttendanceSession; course: Course }>;
  getRecords(sessionId: string): Promise<AttendanceRecord[]>;
  markAttendance(sessionId: string, userId: string, status: ManualStatus): Promise<void>;
  subscribeToken(sessionId: string, onTick: (tick: TokenTick) => void, onError?: (message: string) => void): () => void;
  checkIn(token: string, deviceId: string): Promise<CheckInResult>;
  createCourse(input: CourseInput): Promise<Course>;
  getCourse(courseId: string): Promise<Course>;
  openJoin(courseId: string): Promise<Course>;
  closeJoin(courseId: string): Promise<Course>;
  subscribeJoinToken(courseId: string, onTick: (tick: TokenTick) => void, onError?: (message: string) => void): () => void;
  getStudents(courseId: string): Promise<Student[]>;
  addStudent(courseId: string, number: string): Promise<Student>;
  removeStudent(courseId: string, userId: string): Promise<void>;
  previewJoin(token: string): Promise<JoinPreview>;
  joinCourse(ticket: string): Promise<Course>;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
