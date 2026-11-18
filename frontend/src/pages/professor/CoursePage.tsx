import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, type Course, type Student } from '../../api';
import type { BandId } from '../../audio/protocol';
import { UltrasonicTransmitter } from '../../audio/transmitter';
import { IconChevron, IconPause, IconSpeaker } from '../../components/icons';
import { Modal } from '../../components/Modal';
import { PortalLayout } from '../../components/PortalLayout';
import { DEFAULT_VOLUME, SignalControls, loadBand, saveBand } from './SignalControls';
import './professor.css';

const POLL_MS = 3000;

export function CoursePage() {
  const { courseId = '' } = useParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [students, setStudents] = useState<Student[] | null>(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());

  const [expiresAt, setExpiresAt] = useState(0);
  const [broadcasting, setBroadcasting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [audioError, setAudioError] = useState('');
  const [volume, setVolume] = useState(DEFAULT_VOLUME);
  const [band, setBand] = useState<BandId>(loadBand);
  const tokenRef = useRef<string | null>(null);
  const txRef = useRef<UltrasonicTransmitter | null>(null);
  const openRef = useRef(false);

  const [number, setNumber] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [removing, setRemoving] = useState<Student | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);

  const joinOpen = !!course?.joinOpen;

  useEffect(() => {
    openRef.current = joinOpen;
  }, [joinOpen]);

  useEffect(() => {
    api
      .getCourse(courseId)
      .then(setCourse)
      .catch((e) => setError(e instanceof Error ? e.message : '강의를 불러오지 못했어요'));
  }, [courseId]);

  const loadStudents = useCallback(async () => {
    try {
      setStudents(await api.getStudents(courseId));
    } catch {}
  }, [courseId]);

  useEffect(() => {
    void loadStudents();
    if (!joinOpen) return;
    const id = window.setInterval(loadStudents, POLL_MS);
    return () => clearInterval(id);
  }, [joinOpen, loadStudents]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    txRef.current = new UltrasonicTransmitter(() => tokenRef.current);
    return () => {
      txRef.current?.dispose();
      if (openRef.current) void api.closeJoin(courseId).catch(() => {});
    };
  }, [courseId]);

  useEffect(() => {
    if (!joinOpen) {
      tokenRef.current = null;
      return;
    }
    return api.subscribeJoinToken(
      courseId,
      (t) => {
        tokenRef.current = t.token;
        setExpiresAt(t.expiresAt);
      },
      setAudioError,
    );
  }, [joinOpen, courseId]);

  const playSignal = async () => {
    const tx = txRef.current;
    if (!tx) return false;
    try {
      setAudioError('');
      tx.setVolume(volume / 100);
      tx.setBand(band);
      await tx.start();
      setBroadcasting(true);
      return true;
    } catch {
      setAudioError('소리를 낼 수 없어요. 브라우저 소리 권한을 확인해주세요.');
      return false;
    }
  };

  const pauseSignal = () => {
    txRef.current?.stop();
    setBroadcasting(false);
  };

  const startRecruit = async () => {
    setBusy(true);
    try {
      if (!(await playSignal())) return;
      setCourse(await api.openJoin(courseId));
    } catch (e) {
      pauseSignal();
      setAudioError(e instanceof Error ? e.message : '모집을 시작하지 못했어요');
    } finally {
      setBusy(false);
    }
  };

  const stopRecruit = async () => {
    setBusy(true);
    pauseSignal();
    try {
      setCourse(await api.closeJoin(courseId));
    } catch (e) {
      setAudioError(e instanceof Error ? e.message : '모집을 끝내지 못했어요');
    } finally {
      setBusy(false);
    }
  };

  const changeVolume = (v: number) => {
    setVolume(v);
    txRef.current?.setVolume(v / 100);
  };

  const changeBand = (b: BandId) => {
    setBand(b);
    saveBand(b);
    txRef.current?.setBand(b);
  };

  const addStudent = async (e: FormEvent) => {
    e.preventDefault();
    if (!number.trim()) return;
    setAdding(true);
    setAddError('');
    try {
      await api.addStudent(courseId, number.trim());
      setNumber('');
      await loadStudents();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : '추가하지 못했어요');
    } finally {
      setAdding(false);
    }
  };

  const removeStudent = async () => {
    if (!removing) return;
    setRemoveBusy(true);
    try {
      await api.removeStudent(courseId, removing.userId);
      await loadStudents();
      setRemoving(null);
    } finally {
      setRemoveBusy(false);
    }
  };

  if (error) {
    return (
      <PortalLayout>
        <div className="card empty">{error}</div>
      </PortalLayout>
    );
  }
  if (!course) {
    return (
      <PortalLayout>
        <div className="card skeleton" style={{ height: 320 }} />
      </PortalLayout>
    );
  }

  const slotLeft = Math.max(0, expiresAt - now);
  const slotPct = Math.min(100, (slotLeft / 5000) * 100);

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
            {joinOpen && <span className="badge badge-live">모집 중</span>}
          </div>
          <p className="page-caption">
            {[course.semester, course.schedule, course.room].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>

      <div className="session-grid">
        <section className="card broadcast">
          <div className={`pulse-wrap broadcast-pulse ${joinOpen && broadcasting ? 'on' : 'off'}`}>
            <span className="pulse-ring" />
            <span className="pulse-ring" />
            <span className="pulse-ring" />
            <span className="pulse-core" style={{ width: 112, height: 112 }}>
              <IconSpeaker size={48} />
            </span>
          </div>

          {joinOpen && broadcasting && (
            <div className="slot">
              <div className="slot-head">
                <span>다음 신호까지</span>
                <span className="num">{(slotLeft / 1000).toFixed(1)}초</span>
              </div>
              <div className="slot-bar">
                <span style={{ width: `${slotPct}%` }} />
              </div>
            </div>
          )}

          <div className="recruit-actions">
            {!joinOpen && (
              <button className="btn btn-primary btn-lg btn-block" onClick={startRecruit} disabled={busy}>
                모집 시작
              </button>
            )}
            {joinOpen && broadcasting && (
              <button className="btn btn-grey btn-lg btn-block" onClick={pauseSignal}>
                <IconPause size={18} /> 일시정지
              </button>
            )}
            {joinOpen && !broadcasting && (
              <button className="btn btn-primary btn-lg btn-block" onClick={playSignal}>
                신호 보내기
              </button>
            )}
            {joinOpen && (
              <button className="btn btn-danger btn-lg btn-block" onClick={stopRecruit} disabled={busy}>
                모집 끝내기
              </button>
            )}
          </div>
          {audioError && <p className="error-text">{audioError}</p>}

          <SignalControls volume={volume} onVolume={changeVolume} band={band} onBand={changeBand} />
        </section>

        <section className="card student-panel">
          <div className="student-panel-head">
            <h2 className="card-title num">수강생 {students?.length ?? course.studentCount}명</h2>
            <form className="student-add" onSubmit={addStudent}>
              <input
                className="input input-sm"
                placeholder="학번으로 추가"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                inputMode="numeric"
              />
              <button className="btn btn-secondary btn-sm" disabled={!number.trim() || adding}>
                추가
              </button>
            </form>
          </div>
          {addError && <p className="error-text student-add-error">{addError}</p>}

          <div className="student-list">
            {students?.length === 0 && <p className="empty">아직 수강생이 없어요</p>}
            {students?.map((s) => (
              <div key={s.userId} className="student-row">
                <span className="student-name">{s.name}</span>
                <span className="student-number num">{s.number}</span>
                <button className="btn btn-text btn-sm" onClick={() => setRemoving(s)}>
                  삭제
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <Modal
        open={!!removing}
        onClose={() => !removeBusy && setRemoving(null)}
        title={`${removing?.name ?? ''} 학생을 삭제할까요?`}
        actions={
          <>
            <button className="btn btn-grey" onClick={() => setRemoving(null)} disabled={removeBusy}>
              취소
            </button>
            <button className="btn btn-primary" onClick={removeStudent} disabled={removeBusy}>
              삭제
            </button>
          </>
        }
      >
        <p className="modal-desc">이 강의의 출석 명단에서 빠져요.</p>
      </Modal>
    </PortalLayout>
  );
}
