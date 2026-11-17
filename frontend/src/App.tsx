import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, homePathOf, useAuth } from './auth/AuthContext';
import { RequireRole } from './components/RequireRole';
import { LoginPage } from './pages/LoginPage';
import { CourseListPage } from './pages/professor/CourseListPage';
import { SessionPage } from './pages/professor/SessionPage';
import { CheckInPage } from './pages/student/CheckInPage';
import { StudentHomePage } from './pages/student/StudentHomePage';

function Home() {
  const { user } = useAuth();
  return <Navigate to={user ? homePathOf(user) : '/login'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/professor"
            element={
              <RequireRole role="PROFESSOR">
                <CourseListPage />
              </RequireRole>
            }
          />
          <Route
            path="/professor/sessions/:sessionId"
            element={
              <RequireRole role="PROFESSOR">
                <SessionPage />
              </RequireRole>
            }
          />
          <Route
            path="/student"
            element={
              <RequireRole role="STUDENT">
                <StudentHomePage />
              </RequireRole>
            }
          />
          <Route
            path="/student/check-in"
            element={
              <RequireRole role="STUDENT">
                <CheckInPage />
              </RequireRole>
            }
          />
          <Route path="*" element={<Home />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
