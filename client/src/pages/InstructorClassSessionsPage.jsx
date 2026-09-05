import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { instructorApi } from '../api/instructorApi';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { StatusBadge } from '../components/common/StatusBadge';
import { Calendar, Clock, MapPin, Users, ArrowLeft, ArrowRight, UserCheck } from 'lucide-react';
import { formatLocalDate, formatDisplayTime } from '../utils/date';

export function InstructorClassSessionsPage() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await instructorApi.getClassSessions(classId);
        setSessions(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message || 'Failed to load assigned sessions for this class.');
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [classId]);

  if (loading) {
    return <LoadingSpinner message="Retrieving your assigned sessions..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <Link
          to="/instructor/classes"
          className="btn btn-secondary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}
        >
          <ArrowLeft size={16} />
          <span>Back to Classes</span>
        </Link>
        <div className="page-header" style={{ marginBottom: '0' }}>
          <div>
            <h1 className="page-title">My Sessions for Class #{classId}</h1>
            <p className="page-subtitle">
              Displaying only sessions of this class where you are assigned as Primary or Co-Instructor.
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="card" style={{ textAlign: 'center', padding: '36px', color: 'var(--danger)' }}>
          {error}
        </div>
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No assigned sessions found"
          description="You are currently not scheduled as primary instructor or co-instructor for any sessions of this class."
        />
      ) : (
        <div className="grid-cols-2">
          {sessions.map((sess) => {
            const isPrimary =
              sess.primaryInstructorId === user?.id ||
              sess.primary_instructor_id === user?.id ||
              sess.primaryInstructor?.id === user?.id;
            const coInstructors = sess.coInstructors || [];

            const start = new Date(sess.start_time || sess.startTime);
            const dateStr = formatLocalDate(sess.start_time || sess.startTime);
            const timeStr = formatDisplayTime(sess.start_time || sess.startTime);
            const durationMin = sess.duration || sess.duration_minutes || sess.class?.default_duration || 60;
            const now = new Date();
            const endTime = new Date(start.getTime() + durationMin * 60000);
            const sessionStatus = now < start ? 'SCHEDULED' : now <= endTime ? 'IN_PROGRESS' : 'COMPLETED';

            return (
              <div
                key={sess.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  justifyContent: 'space-between',
                  borderTop: isPrimary ? '3px solid var(--primary)' : '3px solid var(--success)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: '700',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: isPrimary ? 'var(--primary-light)' : 'var(--success-light)',
                          color: isPrimary ? '#818CF8' : '#34D399',
                        }}
                      >
                        {isPrimary ? 'Primary Instructor' : 'Co-Instructor'}
                      </span>
                    </div>
                    <StatusBadge status={sessionStatus} />
                  </div>

                  <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>
                    {sess.class?.title || `Class #${sess.classId || sess.class_id}`}
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Calendar size={16} style={{ color: 'var(--text-muted)' }} />
                      <span>{dateStr}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock size={16} style={{ color: 'var(--text-muted)' }} />
                      <span>{timeStr} ({durationMin} mins)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MapPin size={16} style={{ color: 'var(--text-muted)' }} />
                      <span>Room: {sess.room || 'Studio A'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Users size={16} style={{ color: 'var(--text-muted)' }} />
                      <span>
                        Capacity: <strong>{sess.capacity}</strong> members
                      </span>
                    </div>
                  </div>

                  {coInstructors.length > 0 && (
                    <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      <span>Co-Instructors: </span>
                      <strong style={{ color: 'var(--text-secondary)' }}>
                        {coInstructors.map((c) => c.name || c.user?.name || `ID ${c.instructorId}`).join(', ')}
                      </strong>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => navigate(`/sessions/${sess.id}`)}
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <UserCheck size={16} />
                  <span>View Roster & Attendance</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
