import type { AttendanceStatus } from '../api';

const LABEL: Record<AttendanceStatus, string> = {
  PRESENT: '출석',
  LATE: '지각',
  ABSENT: '미출석',
  SUSPICIOUS: '의심',
};

export function StatusBadge({ status }: { status: AttendanceStatus }) {
  return <span className={`badge badge-${status.toLowerCase()}`}>{LABEL[status]}</span>;
}

export const statusLabel = (s: AttendanceStatus) => LABEL[s];
