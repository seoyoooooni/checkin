import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { api, previewUser, type Role, type User } from '../api';
import { loadAuth, saveAuth, type StoredAuth } from '../api/storage';

interface AuthValue {
  user: User | null;
  login: (number: string, password: string) => Promise<User>;
  logout: () => void;
  enterAs: (role: Extract<Role, 'PROFESSOR' | 'STUDENT'>) => User;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<StoredAuth | null>(() => loadAuth());

  const login = useCallback(async (number: string, password: string) => {
    const res = await api.login(number, password);
    saveAuth(res);
    setAuth(res);
    return res.user;
  }, []);

  const logout = useCallback(() => {
    saveAuth(null);
    setAuth(null);
  }, []);

  const enterAs = useCallback((role: 'PROFESSOR' | 'STUDENT') => {
    const next = { accessToken: '', user: previewUser(role) };
    saveAuth(next);
    setAuth(next);
    return next.user;
  }, []);

  const value = useMemo(
    () => ({ user: auth?.user ?? null, login, logout, enterAs }),
    [auth, login, logout, enterAs],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const v = useContext(AuthContext);
  if (!v) throw new Error('AuthProvider 밖에서 useAuth를 썼어요');
  return v;
}

export const homePathOf = (user: User) => (user.role === 'PROFESSOR' ? '/professor' : '/student');
