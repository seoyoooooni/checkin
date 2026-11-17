import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { USE_SAMPLE } from '../api';
import { homePathOf, useAuth } from '../auth/AuthContext';
import { AuthLayout } from '../components/AuthLayout';
import { IconCheck, IconLock, IconUser } from '../components/icons';

const REMEMBER_KEY = 'pulsein-remember-id';

function loadRememberedId(): string {
  try {
    return localStorage.getItem(REMEMBER_KEY) ?? '';
  } catch {
    return '';
  }
}

function saveRememberedId(id: string | null) {
  try {
    if (id) localStorage.setItem(REMEMBER_KEY, id);
    else localStorage.removeItem(REMEMBER_KEY);
  } catch {}
}

export function LoginPage() {
  const { user, login, enterAs } = useAuth();
  const navigate = useNavigate();
  const [number, setNumber] = useState(loadRememberedId);
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(() => loadRememberedId() !== '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={homePathOf(user)} replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const u = await login(number.trim(), password);
      saveRememberedId(remember ? number.trim() : null);
      navigate(homePathOf(u), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했어요');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <form className="login-form" onSubmit={onSubmit}>
        <h1 className="login-title">통합로그인</h1>

        <div className="login-fields">
          <label className="login-field">
            <span className="login-label">아이디</span>
            <span className="login-input-wrap">
              <IconUser size={24} className="login-input-icon" />
              <input
                className="login-input"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="학번 또는 교번을 입력해주세요"
                autoComplete="username"
                inputMode="text"
                autoFocus={!number}
              />
            </span>
          </label>

          <label className="login-field">
            <span className="login-label">비밀번호</span>
            <span className="login-input-wrap">
              <IconLock size={24} className="login-input-icon" />
              <input
                className="login-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력해주세요"
                autoComplete="current-password"
                autoFocus={!!number}
              />
            </span>
          </label>

          <label className="login-remember">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            <span className="login-check" aria-hidden>
              <IconCheck size={13} />
            </span>
            아이디 기억하기
          </label>

          {error && <p className="error-text">{error}</p>}
        </div>

        <button className="login-submit" disabled={!number.trim() || !password || loading}>
          {loading ? '확인하고 있어요' : '로그인'}
        </button>

        <div className="login-links">
          <button type="button" onClick={() => navigate('/signup')}>
            회원가입
          </button>
          <button type="button">비밀번호 재설정</button>
        </div>

        {USE_SAMPLE && (
          <div className="login-shortcuts">
            <span className="login-shortcuts-label">체험하기</span>
            <button type="button" onClick={() => navigate(homePathOf(enterAs('PROFESSOR')), { replace: true })}>
              교수 화면
            </button>
            <span className="login-shortcuts-dot" aria-hidden />
            <button type="button" onClick={() => navigate(homePathOf(enterAs('STUDENT')), { replace: true })}>
              학생 화면
            </button>
          </div>
        )}
      </form>
    </AuthLayout>
  );
}
