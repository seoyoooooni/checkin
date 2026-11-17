import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { homePathOf, useAuth } from '../auth/AuthContext';
import { AuthLayout } from '../components/AuthLayout';
import { IconIdCard, IconLock, IconUser } from '../components/icons';

const MIN_PASSWORD = 8;

function roleOf(number: string): 'PROFESSOR' | 'STUDENT' | null {
  const v = number.trim().toUpperCase();
  if (/^P\d{3,15}$/.test(v)) return 'PROFESSOR';
  if (/^\d{5,15}$/.test(v)) return 'STUDENT';
  return null;
}

export function SignupPage() {
  const { user, signup } = useAuth();
  const navigate = useNavigate();
  const [number, setNumber] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={homePathOf(user)} replace />;

  const role = roleOf(number);
  const mismatch = confirm.length > 0 && confirm !== password;
  const shortPassword = password.length > 0 && password.length < MIN_PASSWORD;
  const ready = role !== null && name.trim() !== '' && password.length >= MIN_PASSWORD && confirm === password;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    setError('');
    setLoading(true);
    try {
      const u = await signup(number.trim(), name.trim(), password);
      navigate(homePathOf(u), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '가입하지 못했어요');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <form className="login-form" onSubmit={onSubmit}>
        <h1 className="login-title">회원가입</h1>

        <div className="login-fields">
          <label className="login-field">
            <span className="login-label">아이디</span>
            <span className="login-input-wrap">
              <IconIdCard size={24} className="login-input-icon" />
              <input
                className="login-input"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="학번 또는 교번"
                autoComplete="username"
                autoFocus
              />
            </span>
          </label>

          <label className="login-field">
            <span className="login-label">이름</span>
            <span className="login-input-wrap">
              <IconUser size={24} className="login-input-icon" />
              <input
                className="login-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름을 입력해주세요"
                autoComplete="name"
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
                placeholder="8자 이상 입력해주세요"
                autoComplete="new-password"
              />
            </span>
            {shortPassword && <span className="signup-hint bad">8자 이상이어야 해요</span>}
          </label>

          <label className="login-field">
            <span className="login-label">비밀번호 확인</span>
            <span className="login-input-wrap">
              <IconLock size={24} className="login-input-icon" />
              <input
                className="login-input"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="비밀번호를 한 번 더 입력해주세요"
                autoComplete="new-password"
              />
            </span>
            {mismatch && <span className="signup-hint bad">비밀번호가 서로 달라요</span>}
          </label>

          {error && <p className="error-text">{error}</p>}
        </div>

        <button className="login-submit" disabled={!ready || loading}>
          {loading ? '가입하고 있어요' : '가입하기'}
        </button>

        <div className="signup-footer">
          이미 계정이 있나요?
          <button type="button" onClick={() => navigate('/login')}>
            로그인
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}
