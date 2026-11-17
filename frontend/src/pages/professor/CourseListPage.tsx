import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type AttendanceSession, type Course } from '../../api';
import { IconBook } from '../../components/icons';
import { Modal } from '../../components/Modal';
import { PortalLayout } from '../../components/PortalLayout';
import './professor.css';

const LATE_OPTIONS = [5, 10, 15, 20];

interface Row {
  course: Course;
  active: AttendanceSession | null;
}

export function CourseListPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState('');
  const [target, setTarget] = useState<Course | null>(null);
  const [lateAfter, setLateAfter] = useState(10);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const courses = await api.getMyCourses();
        const actives = await Promise.all(courses.map((c) => api.getActiveSession(c.id)));
        if (alive) setRows(courses.map((course, i) => ({ course, active: actives[i] })));
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : '강의를 불러오지 못했어요');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const start = async () => {
    if (!target) return;
    setStarting(true);
    try {
      const s = await api.startSession(target.id, lateAfter);
      navigate(`/professor/sessions/${s.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '출석을 시작하지 못했어요');
      setStarting(false);
      setTarget(null);
    }
  };

  return (
    <PortalLayout>
      <div className="page-head">
        <div>
          <h1 className="page-title with-icon">
            <IconBook size={26} />
            담당 강의
          </h1>
          <p className="page-caption">출석을 시작할 강의를 골라주세요</p>
        </div>
      </div>

      {error && <div className="card empty">{error}</div>}
      {!rows && !error && <div className="course-grid">{[0, 1, 2].map((i) => <div key={i} className="card skeleton" />)}</div>}
      {rows?.length === 0 && <div className="card empty">담당 강의가 없어요</div>}

      {rows && (
        <div className="course-grid">
          {rows.map(({ course, active }) => (
            <article key={course.id} className="card course-card">
              <div className="course-card-top">
                <span className="course-code">
                  {course.name}-{course.section}
                </span>
                <span className="chip num">{course.semester}</span>
              </div>
              {active && <span className="badge badge-live course-live">출석 진행 중</span>}
              <h2 className="course-name">{course.name}</h2>
              <dl className="course-meta">
                <div>
                  <dt>시간</dt>
                  <dd>{course.schedule}</dd>
                </div>
                <div>
                  <dt>강의실</dt>
                  <dd>{course.room}</dd>
                </div>
                <div>
                  <dt>수강생</dt>
                  <dd className="num">{course.studentCount}명</dd>
                </div>
              </dl>
              {active ? (
                <button
                  className="btn btn-secondary btn-block"
                  onClick={() => navigate(`/professor/sessions/${active.id}`)}
                >
                  진행 중인 출석 보기
                </button>
              ) : (
                <button className="btn btn-primary btn-block" onClick={() => setTarget(course)}>
                  출석 시작
                </button>
              )}
            </article>
          ))}
        </div>
      )}

      <Modal
        open={!!target}
        onClose={() => !starting && setTarget(null)}
        title={
          <>
            {target?.name} {target?.section}반
            <br />
            출석을 시작할게요
          </>
        }
        actions={
          <>
            <button className="btn btn-grey" onClick={() => setTarget(null)} disabled={starting}>
              취소
            </button>
            <button className="btn btn-primary" onClick={start} disabled={starting}>
              {starting ? '시작하는 중' : '시작하기'}
            </button>
          </>
        }
      >
        <div className="field late-field">
          <span className="field-label">지각 기준</span>
          <div className="segmented">
            {LATE_OPTIONS.map((m) => (
              <button key={m} type="button" className={m === lateAfter ? 'active' : ''} onClick={() => setLateAfter(m)}>
                {m}분
              </button>
            ))}
          </div>
          <p className="modal-desc">시작하고 {lateAfter}분이 지나면 지각으로 기록돼요.</p>
        </div>
      </Modal>
    </PortalLayout>
  );
}
