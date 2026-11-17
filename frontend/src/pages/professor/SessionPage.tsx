import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  api,
  type AttendanceRecord,
  type AttendanceSession,
  type AttendanceStatus,
  type Course,
  type ManualStatus,
} from '../../api';
import { UltrasonicTransmitter } from '../../audio/transmitter';
import { IconChevron, IconPause, IconSearch, IconSpeaker } from '../../components/icons';
import { Modal } from '../../components/Modal';
import { statusLabel } from '../../components/StatusBadge';
import { PortalLayout } from '../../components/PortalLayout';
import './professor.css';

const POLL_MS = 3000;

type Filter = 'ALL' | AttendanceStatus;
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'ALL', label: '전체' },
  { key: 'PRESENT', label: '출석' },
  { key: 'LATE', label: '지각' },
  { key: 'ABSENT', label: '미출석' },
];

const NEXT_STATUS: Record<AttendanceStatus, ManualStatus> = {
  ABSENT: 'PRESENT',
  PRESENT: 'LATE',
  LATE: 'ABSENT',
  SUSPICIOUS: 'PRESENT',
};

const pad = (n: number) => String(n).padStart(2, '0');
function elapsed(fromIso: string, to: number) {
  const s = Math.max(0, Math.floor((to - Date.parse(fromIso)) / 1000));
  const h = Math.floor(s / 3600);
  return h ? `${h}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}` : `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}
const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

export function SessionPage() {
  const { sessionId = '' } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());

  const [expiresAt, setExpiresAt] = useState(0);
  const [broadcasting, setBroadcasting] = useState(false);
  const [audioError, setAudioError] = useState('');
  const [volume, setVolume] = useState(70);
  const tokenRef = useRef<string | null>(null);
  const txRef = useRef<UltrasonicTransmitter | null>(null);

  const [filter, setFilter] = useState<Filter>('ALL');
  const [query, setQuery] = useState('');
  const pendingRef = useRef(0);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [ending, setEnding] = useState(false);

  const open = session?.status === 'OPEN';

  useEffect(() => {
    api
      .getSession(sessionId)
      .then(({ session, course }) => {
        setSession(session);
        setCourse(course);
      })
      .catch((e) => setError(e instanceof Error ? e.message : '출석 정보를 불러오지 못했어요'));
  }, [sessionId]);

  const loadRecords = useCallback(async () => {
    try {
      const next = await api.getRecords(sessionId);
      if (pendingRef.current === 0) setRecords(next);
    } catch {}
  }, [sessionId]);

  useEffect(() => {
    if (!session) return;
    void loadRecords();
    if (session.status !== 'OPEN') return;
    const id = window.setInterval(loadRecords, POLL_MS);
    return () => clearInterval(id);
  }, [session, loadRecords]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    txRef.current = new UltrasonicTransmitter(() => tokenRef.current);
    return () => txRef.current?.dispose();
  }, []);

  useEffect(() => {
    if (!open) return;
    try {
      return api.subscribeToken(sessionId, (t) => {
        tokenRef.current = t.token;
        setExpiresAt(t.expiresAt);
      });
    } catch (e) {
      setAudioError(e instanceof Error ? e.message : '토큰을 받지 못했어요');
    }
  }, [open, sessionId]);

  const toggleBroadcast = async () => {
    const tx = txRef.current;
    if (!tx) return;
    if (tx.running) {
      tx.stop();
      setBroadcasting(false);
      return;
    }
    try {
      setAudioError('');
      tx.setVolume(volume / 100);
      await tx.start();
      setBroadcasting(true);
    } catch {
      setAudioError('소리를 낼 수 없어요. 브라우저 소리 권한을 확인해주세요.');
    }
  };

  const changeVolume = (v: number) => {
    setVolume(v);
    txRef.current?.setVolume(v / 100);
  };

  const endSession = async () => {
    setEnding(true);
    try {
      txRef.current?.stop();
      setBroadcasting(false);
      const s = await api.endSession(sessionId);
      tokenRef.current = null;
      setSession(s);
      setConfirmEnd(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : '종료하지 못했어요');
    } finally {
      setEnding(false);
    }
  };

  const cycleStatus = async (record: AttendanceRecord) => {
    const status = NEXT_STATUS[record.status];
    setRecords((prev) =>
      prev.map((r) =>
        r.userId === record.userId
          ? { ...r, status, manual: true, submittedAt: status === 'ABSENT' ? null : new Date().toISOString() }
          : r,
      ),
    );
    pendingRef.current++;
    try {
      await api.markAttendance(sessionId, record.userId, status);
    } catch {
    } finally {
      pendingRef.current--;
      if (pendingRef.current === 0) void loadRecords();
    }
  };

  const counts = useMemo(() => {
    const c = { PRESENT: 0, LATE: 0, ABSENT: 0, SUSPICIOUS: 0 };
    for (const r of records) c[r.status]++;
    return c;
  }, [records]);
  const total = records.length;
  const attended = counts.PRESENT + counts.LATE;
  const rate = total ? Math.round((attended / total) * 100) : 0;

  const visible = useMemo(() => {
    const q = query.trim();
    return records.filter(
      (r) => (filter === 'ALL' || r.status === filter) && (!q || r.name.includes(q) || r.studentNumber.includes(q)),
    );
  }, [records, filter, query]);

  if (error && !session) {
    return (
      <PortalLayout>
        <div className="card empty">
          {error}
          <div style={{ marginTop: 16 }}>
            <button className="btn btn-grey" onClick={() => navigate('/professor')}>
              강의 목록으로
            </button>
          </div>
        </div>
      </PortalLayout>
    );
  }
  if (!session || !course) {
    return (
      <PortalLayout>
        <div className="card skeleton" style={{ height: 320 }} />
      </PortalLayout>
    );
  }

  const slotLeft = Math.max(0, expiresAt - now);
  const slotPct = (slotLeft / (session.slotSeconds * 1000)) * 100;

  return (
    <PortalLayout>
      <nav className="breadcrumb">
        <Link to="/professor">담당 강의</Link>
        <IconChevron size={14} />
        <span>
          {course.name} {course.section}반
        </span>
      </nav>
      <div className="page-head">
        <div>
          <div className="session-title-row">
            <h1 className="page-title">{course.name}</h1>
            {open ? (
              <span className="badge badge-live num">진행 중 {elapsed(session.startedAt, now)}</span>
            ) : (
              <span className="badge badge-absent">종료됨</span>
            )}
          </div>
          <p className="page-caption">
            {clock(session.startedAt)} 시작 · 지각 기준 {session.lateAfterMin}분 · {course.room}
          </p>
        </div>
        {open ? (
          <button className="btn btn-danger" onClick={() => setConfirmEnd(true)}>
            출석 종료
          </button>
        ) : (
          <button className="btn btn-grey" onClick={() => navigate('/professor')}>
            강의 목록으로
          </button>
        )}
      </div>

      <div className="session-grid">
        <section className="card broadcast">
          {open ? (
            <>
              <div className={`pulse-wrap broadcast-pulse ${broadcasting ? 'on' : 'off'}`}>
                <span className="pulse-ring" />
                <span className="pulse-ring" />
                <span className="pulse-ring" />
                <span className="pulse-core" style={{ width: 112, height: 112 }}>
                  <IconSpeaker size={48} />
                </span>
              </div>
              <h2 className="broadcast-title">{broadcasting ? '출석 신호를 보내고 있어요' : '신호가 멈춰 있어요'}</h2>
              <p className="broadcast-desc">
                {broadcasting
                  ? '학생들에게 출석 화면을 열라고 안내해주세요'
                  : '아래 버튼을 눌러야 소리가 나가요'}
              </p>

              <div className="slot">
                <div className="slot-head">
                  <span>다음 신호까지</span>
                  <span className="num">{(slotLeft / 1000).toFixed(1)}초</span>
                </div>
                <div className="slot-bar">
                  <span style={{ width: `${slotPct}%` }} />
                </div>
              </div>

              <button
                className={`btn btn-lg btn-block ${broadcasting ? 'btn-grey' : 'btn-primary'}`}
                onClick={toggleBroadcast}
              >
                {broadcasting ? (
                  <>
                    <IconPause size={18} /> 일시정지
                  </>
                ) : (
                  '신호 보내기'
                )}
              </button>
              {audioError && <p className="error-text">{audioError}</p>}

              <div className="volume">
                <div className="slot-head">
                  <span>음량</span>
                  <span className="num">{volume}%</span>
                </div>
                <input
                  type="range"
                  className="slider"
                  min={5}
                  max={100}
                  value={volume}
                  style={{ '--fill': `${((volume - 5) / 95) * 100}%` } as CSSProperties}
                  onChange={(e) => changeVolume(Number(e.target.value))}
                />
              </div>
            </>
          ) : (
            <div className="closed">
              <h2 className="broadcast-title">출석이 끝났어요</h2>
              <p className="broadcast-desc">
                {session.endedAt && `${clock(session.endedAt)}에 종료 · `}더 이상 학생이 출석할 수 없어요
              </p>
            </div>
          )}
        </section>

        <section className="session-right">
          <div className="card stats">
            <div className="stats-tiles">
              <Stat label="출석" value={counts.PRESENT} tone="green" />
              <Stat label="지각" value={counts.LATE} tone="orange" />
              <Stat label="미출석" value={counts.ABSENT} tone="grey" />
              <Stat label="출석률" value={`${rate}%`} tone="blue" />
            </div>
            <div className="stack-bar" aria-hidden>
              <span className="g" style={{ width: `${total ? (counts.PRESENT / total) * 100 : 0}%` }} />
              <span className="o" style={{ width: `${total ? (counts.LATE / total) * 100 : 0}%` }} />
            </div>
          </div>

          <div className="card roster">
            <div className="roster-tools">
              <div className="segmented roster-filter">
                {FILTERS.map((f) => (
                  <button key={f.key} className={filter === f.key ? 'active' : ''} onClick={() => setFilter(f.key)}>
                    {f.label}
                    <span className="num">{f.key === 'ALL' ? total : counts[f.key]}</span>
                  </button>
                ))}
              </div>
              <label className="search">
                <IconSearch size={18} />
                <input
                  className="input input-sm"
                  placeholder="이름 또는 학번"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
            </div>

            <div className="roster-list">
              {visible.length === 0 && <p className="empty">해당하는 학생이 없어요</p>}
              {visible.length > 0 && (
                <div className="roster-grid">
                  {visible.map((r) => (
                    <button
                      key={r.userId}
                      type="button"
                      className={`roster-card s-${r.status.toLowerCase()}`}
                      disabled={!open}
                      onClick={() => cycleStatus(r)}
                      aria-label={`${r.name} ${statusLabel(r.status)}`}
                    >
                      <span className="roster-photo">
                        <PhotoPlaceholder />
                      </span>
                      <span className="roster-info">
                        <span className="roster-name">
                          {r.name}
                          {r.manual && <span className="roster-manual">수동</span>}
                        </span>
                        <span className="roster-sub num">{r.studentNumber}</span>
                        {r.submittedAt && <span className="roster-sub num">{clock(r.submittedAt)}</span>}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <Modal
        open={confirmEnd}
        onClose={() => !ending && setConfirmEnd(false)}
        title="출석을 종료할까요?"
        actions={
          <>
            <button className="btn btn-grey" onClick={() => setConfirmEnd(false)} disabled={ending}>
              계속 진행
            </button>
            <button className="btn btn-primary" onClick={endSession} disabled={ending}>
              {ending ? '종료하는 중' : '종료하기'}
            </button>
          </>
        }
      >
        <p className="modal-desc num">
          지금까지 {total}명 중 {attended}명이 출석했어요.
          <br />
          종료하면 신호가 멈추고 학생은 더 이상 출석할 수 없어요.
        </p>
      </Modal>
    </PortalLayout>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone: string }) {
  return (
    <div className={`stat stat-${tone}`}>
      <span className="stat-label">{label}</span>
      <b className="num">{value}</b>
    </div>
  );
}

function PhotoPlaceholder() {
  return (
    <svg className="roster-silhouette" viewBox="0 0 90 120" aria-hidden>
      <circle cx="45" cy="46" r="19" />
      <path d="M8 120c0-24 16.5-40 37-40s37 16 37 40z" />
    </svg>
  );
}
