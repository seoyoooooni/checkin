import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type AttendanceSession, type Course, type CourseInput } from '../../api';
import { IconBook, IconPlus } from '../../components/icons';
import { Modal } from '../../components/Modal';
import { PortalLayout } from '../../components/PortalLayout';
import './professor.css';

const LATE_OPTIONS = [5, 10, 15, 20];

function currentSemester() {
  const now = new Date();
  const month = now.getMonth() + 1;
  return `${now.getFullYear()}-${month >= 3 && month <= 8 ? 1 : 2}`;
}

const emptyInput = (): CourseInput => ({ name: '', section: '', semester: currentSemester(), room: '', schedule: '' });

const COURSE_FIELDS: { key: keyof CourseInput; label: string; placeholder: string }[] = [
  { key: 'name', label: '과목명', placeholder: '예) 웹프로그래밍' },
  { key: 'section', label: '분반', placeholder: '예) A' },
  { key: 'semester', label: '학기', placeholder: '예) 2026-2' },
  { key: 'room', label: '강의실', placeholder: '예) 공학관 405호' },
  { key: 'schedule', label: '수업 시간', placeholder: '예) 월 10:00–12:50' },
];

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
  const [creating, setCreating] = useState(false);
  const [input, setInput] = useState<CourseInput>(emptyInput);
  const [createError, setCreateError] = useState('');
  const [saving, setSaving] = useState(false);

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

  const canCreate = input.name.trim() !== '' && input.section.trim() !== '' && input.semester.trim() !== '';

  const openCreate = () => {
    setInput(emptyInput());
    setCreateError('');
    setCreating(true);
  };

  const create = async () => {
    if (!canCreate) return;
    setSaving(true);
    setCreateError('');
    try {
      const course = await api.createCourse(input);
      navigate(`/professor/courses/${course.id}`);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : '강의를 만들지 못했어요');
      setSaving(false);
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
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <IconPlus size={18} />
          강의 만들기
        </button>
      </div>

      {error && <div className="card empty">{error}</div>}
      {!rows && !error && <div className="course-grid">{[0, 1, 2].map((i) => <div key={i} className="card skeleton" />)}</div>}
      {rows?.length === 0 && (
        <div className="card empty">
          아직 만든 강의가 없어요
          <div className="empty-action">
            <button className="btn btn-primary" onClick={openCreate}>
              강의 만들기
            </button>
          </div>
        </div>
      )}

      {rows && rows.length > 0 && (
        <div className="course-grid">
          {rows.map(({ course, active }) => (
            <article key={course.id} className="card course-card">
              <p className="course-sub">
                {course.semester}학기 · {course.section}반
              </p>
              {active ? (
                <span className="badge badge-live course-live">출석 진행 중</span>
              ) : (
                course.joinOpen && <span className="badge badge-live course-live">수강생 모집 중</span>
              )}
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
              <div className="course-actions">
                <button className="btn btn-secondary" onClick={() => navigate(`/professor/courses/${course.id}`)}>
                  수강생 관리
                </button>
                {active ? (
                  <button className="btn btn-primary" onClick={() => navigate(`/professor/sessions/${active.id}`)}>
                    출석 보기
                  </button>
                ) : (
                  <button className="btn btn-primary" onClick={() => setTarget(course)}>
                    출석 시작
                  </button>
                )}
              </div>
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

      <Modal
        open={creating}
        onClose={() => !saving && setCreating(false)}
        title="강의 만들기"
        actions={
          <>
            <button className="btn btn-grey" onClick={() => setCreating(false)} disabled={saving}>
              취소
            </button>
            <button className="btn btn-primary" onClick={create} disabled={!canCreate || saving}>
              {saving ? '만드는 중' : '만들기'}
            </button>
          </>
        }
      >
        <form
          className="course-form"
          onSubmit={(e) => {
            e.preventDefault();
            void create();
          }}
        >
          {COURSE_FIELDS.map((f) => (
            <label key={f.key} className="field">
              <span className="field-label">{f.label}</span>
              <input
                className="input input-md"
                value={input[f.key]}
                placeholder={f.placeholder}
                autoFocus={f.key === 'name'}
                onChange={(e) => setInput((prev) => ({ ...prev, [f.key]: e.target.value }))}
              />
            </label>
          ))}
          {createError && <p className="error-text">{createError}</p>}
          <button type="submit" hidden />
        </form>
      </Modal>
    </PortalLayout>
  );
}
