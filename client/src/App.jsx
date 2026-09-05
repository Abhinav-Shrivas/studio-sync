import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';

// Pages
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ClassesPage } from './pages/ClassesPage';
import { ClassDetailPage } from './pages/ClassDetailPage';
import { InstructorClassesPage } from './pages/InstructorClassesPage';
import { InstructorClassSessionsPage } from './pages/InstructorClassSessionsPage';
import { SessionsPage } from './pages/SessionsPage';
import { SessionDetailPage } from './pages/SessionDetailPage';
import { RecurringSchedulePage } from './pages/RecurringSchedulePage';
import { BookingsPage } from './pages/BookingsPage';
import { MembershipAlertsPage } from './pages/MembershipAlertsPage';
import { MembersPage } from './pages/MembersPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public login */}
          <Route path="/login" element={<LoginPage />} />

          {/* Authenticated routes inside AppLayout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            {/* Root redirect to dashboard */}
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />

            {/* Staff-Only Routes */}
            <Route
              path="classes"
              element={
                <ProtectedRoute allowedRoles={['STAFF']}>
                  <ClassesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="classes/:id"
              element={
                <ProtectedRoute allowedRoles={['STAFF']}>
                  <ClassDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="sessions/recurring"
              element={
                <ProtectedRoute allowedRoles={['STAFF']}>
                  <RecurringSchedulePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="members"
              element={
                <ProtectedRoute allowedRoles={['STAFF']}>
                  <MembersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="membership-alerts"
              element={
                <ProtectedRoute allowedRoles={['STAFF']}>
                  <MembershipAlertsPage />
                </ProtectedRoute>
              }
            />

            {/* Instructor Discovery Routes */}
            <Route
              path="instructor/classes"
              element={
                <ProtectedRoute allowedRoles={['INSTRUCTOR', 'STAFF']}>
                  <InstructorClassesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="instructor/classes/:classId/sessions"
              element={
                <ProtectedRoute allowedRoles={['INSTRUCTOR', 'STAFF']}>
                  <InstructorClassSessionsPage />
                </ProtectedRoute>
              }
            />

            {/* Shared Scoped Routes */}
            <Route path="sessions" element={<SessionsPage />} />
            <Route path="sessions/:id" element={<SessionDetailPage />} />
            <Route path="bookings" element={<BookingsPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
