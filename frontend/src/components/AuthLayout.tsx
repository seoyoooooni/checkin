import type { ReactNode } from 'react';
import '../pages/login.css';

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="login">
      <aside className="login-hero">
        <img src="/logo-white.png" alt="PulseIn" className="login-hero-logo" />
        <div className="login-waves" aria-hidden>
          <span />
          <span />
          <span />
        </div>
      </aside>

      <main className="login-main">
        <svg className="login-watermark" viewBox="0 0 32 32" aria-hidden>
          <path d="M16.5 10.5a8 8 0 0 1 0 11" />
          <path d="M20.5 7a13 13 0 0 1 0 18" />
        </svg>
        {children}
      </main>
    </div>
  );
}
