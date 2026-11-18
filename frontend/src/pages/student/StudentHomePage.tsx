import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type Course } from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { IconBook, IconMic, IconPlus } from '../../components/icons';
import { PortalLayout } from '../../components/PortalLayout';
import './student.css';

export function StudentHomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getMyCourses()
      .then(setCourses)
      .catch((e) => setError(e instanceof Error ? e.message : '과목을 불러오지 못했어요'));
  }, []);

  return (
    <PortalLayout>
      <section className="checkin-banner">
        <div className="checkin-banner-icon">
          <IconMic size={30} />
        </div>
        <div className="checkin-banner-text">
          <h1>
            {user?.name ? `${user.name}님, ` : ''}강의실에 도착했나요?
          </h1>
        </div>
        <button className="checkin-banner-btn" onClick={() => navigate('/student/check-in')}>
          출석하기
        </button>
      </section>

      <div className="page-head student-courses-head">
        <h2 className="page-title with-icon">
          <IconBook size={26} />내 수강 과목
        </h2>
        <button className="btn btn-secondary" onClick={() => navigate('/student/join')}>
          <IconPlus size={18} />
          강의 참여
        </button>
      </div>

      {error && <div className="card empty">{error}</div>}
      {!courses && !error && (
        <div className="course-grid">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card skeleton" />
          ))}
        </div>
      )}
      {courses?.length === 0 && (
        <div className="card empty">
          아직 참여한 강의가 없어요
          <div className="empty-action">
            <button className="btn btn-primary" onClick={() => navigate('/student/join')}>
              강의 참여
            </button>
          </div>
        </div>
      )}

      {courses && courses.length > 0 && (
        <div className="course-grid">
          {courses.map((c) => (
            <article key={c.id} className="card course-card">
              <p className="course-sub">
                {c.semester}학기 · {c.section}반
              </p>
              <h3 className="course-name">{c.name}</h3>
              <dl className="course-meta">
                <div>
                  <dt>교수</dt>
                  <dd>{c.professorName}</dd>
                </div>
                <div>
                  <dt>시간</dt>
                  <dd>{c.schedule}</dd>
                </div>
                <div>
                  <dt>강의실</dt>
                  <dd>{c.room}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </PortalLayout>
  );
}
