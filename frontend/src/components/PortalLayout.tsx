import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { homePathOf, useAuth } from '../auth/AuthContext';
import { IconLogout } from './icons';

export function PortalLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="portal">
      <header className="portal-header">
        <div className="portal-header-inner">
          <Link to={user ? homePathOf(user) : '/'} className="portal-brand">
            <img src="/logo.png" alt="PulseIn" className="portal-logo" />
          </Link>
          <span className="portal-spacer" />
          {user && (
            <div className="user-chip">
              <b className="num">
                {user.name}
                {user.number && <span className="user-chip-num"> / {user.number}</span>}
              </b>
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
