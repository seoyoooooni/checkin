import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { homePathOf, useAuth } from '../auth/AuthContext';
import { BrandMark } from './BrandMark';
import { IconLogout } from './icons';

export function PortalLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isProfessor = user?.role === 'PROFESSOR';

  return (
    <div className="portal">
      <header className="portal-header">
        <div className="portal-header-inner">
          <Link to={user ? homePathOf(user) : '/'} className="portal-brand">
            <BrandMark size={30} />
            PulseIn
          </Link>
          <span className="portal-divider" />
          <span className="portal-sub">{isProfessor ? '교수 포털' : '학생 포털'}</span>
          <span className="portal-spacer" />
          {user && (
            <div className="user-chip">
              <b className="num">
                {user.name}
                {user.number && <span className="user-chip-num"> / {user.number}</span>}
              </b>
              <span className="user-chip-role">{isProfessor ? '교수' : '학생'}</span>
            </div>
          )}
          <button
            className="logout-btn"
            onClick={() => {
              logout();
              navigate('/login', { replace: true });
            }}
          >
            <IconLogout size={20} />
            로그아웃
          </button>
        </div>
      </header>
      <main className="portal-main">{children}</main>
    </div>
  );
}
