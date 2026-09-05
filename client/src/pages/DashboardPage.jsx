import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dashboardApi } from '../api/dashboardApi';
import { StatCard } from '../components/dashboard/StatCard';
import { AttendanceChart } from '../components/dashboard/AttendanceChart';
import { StatusBreakdown } from '../components/dashboard/StatusBreakdown';
import { ClassBreakdown } from '../components/dashboard/ClassBreakdown';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Calendar, Users, AlertTriangle, Clock, RefreshCw, Info } from 'lucide-react';

export function DashboardPage() {
  const { user, role, isStaff } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await dashboardApi.getDashboard();
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to fetch dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading && !data) {
    return (
      <div style={{ paddingTop: '80px' }}>
        <LoadingSpinner message="Aggregating studio intelligence..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <p style={{ color: 'var(--danger)', marginBottom: '16px', fontSize: '1.05rem' }}>{error}</p>
        <button onClick={fetchDashboard} className="btn btn-primary" style={{ margin: '0 auto' }}>
          <RefreshCw size={16} />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  const summary = data?.summary || {};
  const bookingsByStatus = data?.bookingsByStatus || [];
  const bookingsByClass = data?.bookingsByClass || [];
  const attendanceByWeek = data?.attendanceByWeek || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Welcome back, {user?.name || 'Studio Member'}
          </h1>
          <p className="page-subtitle">
            {isStaff
              ? 'Studio-wide operational health, capacity metrics, and attendance trends.'
              : 'Your assigned sessions, attendance performance, and roster activity.'}
          </p>
        </div>

        <button
          onClick={fetchDashboard}
          className="btn btn-secondary btn-sm"
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'spinning' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {!isStaff && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#6EE7B7',
            fontSize: '0.88rem',
          }}
        >
          <Info size={18} style={{ flexShrink: 0 }} />
          <span>
            <strong>Instructor Scoped View:</strong> Dashboard metrics and attendance data are strictly filtered to sessions where you are assigned as Primary or Co-Instructor.
          </span>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid-cols-4">
        <StatCard
          title="Sessions Today"
          value={summary.sessionsToday}
          subtitle="Scheduled classes for today"
          icon={Calendar}
          color="indigo"
        />
        <StatCard
          title="Bookings Today"
          value={summary.bookingsToday}
          subtitle="Active reservations today"
          icon={Users}
          color="emerald"
        />
        <StatCard
          title="No-Shows This Week"
          value={summary.noShowsThisWeek}
          subtitle="Unattended bookings marked NO_SHOW"
          icon={AlertTriangle}
          color="rose"
        />
        <StatCard
          title="Currently Waitlisted"
          value={summary.currentlyWaitlisted}
          subtitle="Members in queue for full sessions"
          icon={Clock}
          color="amber"
        />
      </div>

      {/* 8-Week Attendance Chart */}
      <AttendanceChart data={attendanceByWeek} />

      {/* Status & Class Breakdown Grid */}
      <div className="grid-cols-2">
        <StatusBreakdown data={bookingsByStatus} />
        <ClassBreakdown data={bookingsByClass} />
      </div>
    </div>
  );
}
