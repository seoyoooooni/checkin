import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { Role } from '../api';
import { homePathOf, useAuth } from '../auth/AuthContext';

export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={homePathOf(user)} replace />;
  return <>{children}</>;
}
