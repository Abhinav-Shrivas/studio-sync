import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { classApi } from '../api/classApi';
import { sessionApi } from '../api/sessionApi';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { toLocalISOString, formatLocalDate, formatDisplayTime } from '../utils/date';
import {
  Layers,
  Calendar,
  Clock,
  Users,
  MapPin,
  ArrowLeft,
  Plus,
  Repeat,
  UserCheck,
  AlertCircle,
  Check,
} from 'lucide-react';

const ACTIVE_INSTRUCTORS = [
  { id: '2', name: 'Priya Sharma' },
  { id: '3', name: 'Raj Patel' },
  { id: '4', name: 'Anita Desai' },
];

export function ClassDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cls, setCls] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // New Session Modal
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [sessionForm, setSessionForm] = useState({
    date: '',
    start_time: '10:00',
    room: 'Studio A',
    primary_instructor_id: '2', // Priya default
    capacity: 15,
    co_instructor_ids: [],
  });
  const [sessionError, setSessionError] = useState(null);
  const [submittingSession, setSubmittingSession] = useState(false);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const [classData, sessionsData] = await Promise.all([
        classApi.getClassById(id),
        classApi.getClassSessions(id),
      ]);
      setCls(classData);
      setSessions(Array.isArray(sessionsData) ? sessionsData : []);
      if (classData?.defaultCapacity || classData?.default_capacity) {
        setSessionForm((prev) => ({
          ...prev,
          capacity: classData.defaultCapacity || classData.default_capacity,
        }));
      }
    } catch (err) {
      setError(err.message || 'Failed to load class details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (!sessionForm.date || !sessionForm.start_time) {
      setSessionError('Date and start time are required.');
      return;
    }

    try {
      setSubmittingSession(true);
      setSessionError(null);
      const startDateTime = toLocalISOString(sessionForm.date, sessionForm.start_time);

      await sessionApi.createSession({
        class_id: Number(id),
        start_time: startDateTime,
        room: sessionForm.room.trim(),
        primary_instructor_id: Number(sessionForm.primary_instructor_id),
        capacity: Number(sessionForm.capacity),
        co_instructor_ids: sessionForm.co_instructor_ids.map(Number),
      });

      setIsSessionModalOpen(false);
      setSessionForm({
        date: '',
        start_time: '10:00',
        room: 'Studio A',
        primary_instructor_id: '2',
        capacity: cls?.default_capacity || cls?.defaultCapacity || 15,
        co_instructor_ids: [],
      });
      fetchDetails();
    } catch (err) {
      setSessionError(err.message || 'Failed to schedule session.');
    } finally {
      setSubmittingSession(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading class profile & sessions..." />;
  }

  if (error || !cls) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '36px' }}>
        <p style={{ color: 'var(--danger)', marginBottom: '16px' }}>{error || 'Class not found'}</p>
        <Link to="/classes" className="btn btn-secondary">
          <ArrowLeft size={16} />
          <span>Back to Classes</span>
        </Link>
      </div>
    );
  }

  const isArchived = Boolean(cls.is_archived ?? cls.isArchived);
  const classDuration = cls.default_duration ?? cls.defaultDuration ?? 60;
  const classCapacity = cls.default_capacity ?? cls.defaultCapacity ?? 15;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <Link
          to="/classes"
          className="btn btn-secondary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}
        >
          <ArrowLeft size={16} />
          <span>Back to Classes</span>
        </Link>

        <div className="page-header" style={{ marginBottom: '0' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <h1 className="page-title">{cls.title}</h1>
              <StatusBadge status={isArchived ? 'ARCHIVED' : 'ACTIVE'} />
            </div>
            <p className="page-subtitle">{cls.description || 'No description provided.'}</p>
          </div>

          {!isArchived && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => navigate(`/sessions/recurring?class_id=${cls.id}`)}
                className="btn btn-secondary"
              >
                <Repeat size={16} />
                <span>Recurring Schedule</span>
              </button>
              <button
                onClick={() => {
                  setSessionError(null);
                  setIsSessionModalOpen(true);
                }}
                className="btn btn-primary"
              >
                <Plus size={16} />
                <span>Schedule Session</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Class Meta Grid */}
      <div className="grid-cols-4">
        <div className="card">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Discipline</span>
          <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#818CF8', marginTop: '4px' }}>
            {cls.discipline}
          </div>
        </div>
        <div className="card">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Duration</span>
          <div style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '4px' }}>
            {classDuration} minutes
          </div>
        </div>
        <div className="card">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Default Capacity</span>
          <div style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '4px' }}>
            {classCapacity} members
          </div>
        </div>
        <div className="card">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Sessions</span>
          <div style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '4px' }}>
            {sessions.length}
          </div>
        </div>
      </div>

      {/* Class Sessions List */}
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px' }}>
          Scheduled Sessions
        </h2>

        {sessions.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No sessions scheduled yet"
            description="Schedule the first session for this class to open member bookings."
            actionLabel={!isArchived ? 'Schedule Session' : undefined}
            onAction={!isArchived ? () => setIsSessionModalOpen(true) : undefined}
          />
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Room</th>
                  <th>Primary Instructor</th>
                  <th>Capacity</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((sess) => {
                  const dateStr = formatLocalDate(sess.start_time || sess.startTime);
                  const timeStr = formatDisplayTime(sess.start_time || sess.startTime);
                  const start = new Date(sess.start_time || sess.startTime);
                  const durationMin = sess.duration || sess.duration_minutes || classDuration || 60;
                  const now = new Date();
                  const endTime = new Date(start.getTime() + durationMin * 60000);
                  const status = now < start ? 'SCHEDULED' : now <= endTime ? 'IN_PROGRESS' : 'COMPLETED';

                  return (
                    <tr key={sess.id}>
                      <td>
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                          {dateStr}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {timeStr} ({durationMin} mins)
                        </div>
                      </td>
                      <td>{sess.room || 'Studio A'}</td>
                      <td>{sess.primaryInstructor?.name || sess.primaryInstructorId || 'Assigned'}</td>
                      <td>
                        <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                          {sess.capacity} members
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={status} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => navigate(`/sessions/${sess.id}`)}
                          className="btn btn-secondary btn-sm"
                        >
                          <UserCheck size={14} />
                          <span>Roster</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Session Modal */}
      <Modal
        isOpen={isSessionModalOpen}
        onClose={() => setIsSessionModalOpen(false)}
        title={`Schedule Session: ${cls.title}`}
      >
        <form onSubmit={handleCreateSession} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {sessionError && (
            <div
              style={{
                padding: '10px 12px',
                backgroundColor: 'var(--danger-light)',
                border: '1px solid var(--danger)',
                borderRadius: 'var(--radius-sm)',
                color: '#FCA5A5',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={16} />
              <span>{sessionError}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>
                Session Date *
              </label>
              <input
                type="date"
                className="input-field"
                value={sessionForm.date}
                onChange={(e) => setSessionForm({ ...sessionForm, date: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>
                Start Time *
              </label>
              <input
                type="time"
                className="input-field"
                value={sessionForm.start_time}
                onChange={(e) => setSessionForm({ ...sessionForm, start_time: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>
                Room / Location *
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Studio A, Main Hall"
                value={sessionForm.room}
                onChange={(e) => setSessionForm({ ...sessionForm, room: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>
                Capacity *
              </label>
              <input
                type="number"
                className="input-field"
                min="1"
                max="200"
                value={sessionForm.capacity}
                onChange={(e) => setSessionForm({ ...sessionForm, capacity: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>
              Primary Instructor *
            </label>
            <select
              className="select-field"
              value={sessionForm.primary_instructor_id}
              onChange={(e) => {
                const newPrimary = e.target.value;
                setSessionForm({
                  ...sessionForm,
                  primary_instructor_id: newPrimary,
                  co_instructor_ids: sessionForm.co_instructor_ids.filter((ciId) => String(ciId) !== newPrimary),
                });
              }}
            >
              {ACTIVE_INSTRUCTORS.map((ins) => (
                <option key={ins.id} value={ins.id}>
                  {ins.name} (ID: {ins.id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label" style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600' }}>
              Assign Co-Instructors (Optional)
            </label>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
              Select additional instructors assisting with this session (cannot be the primary instructor).
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {ACTIVE_INSTRUCTORS.filter((ins) => String(ins.id) !== String(sessionForm.primary_instructor_id)).map((ins) => {
                const isSelected = sessionForm.co_instructor_ids.some((ciId) => String(ciId) === String(ins.id));
                return (
                  <button
                    key={ins.id}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSessionForm({
                          ...sessionForm,
                          co_instructor_ids: sessionForm.co_instructor_ids.filter((ciId) => String(ciId) !== String(ins.id)),
                        });
                      } else {
                        setSessionForm({
                          ...sessionForm,
                          co_instructor_ids: [...sessionForm.co_instructor_ids, ins.id],
                        });
                      }
                    }}
                    className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                    style={{
                      borderRadius: 'var(--radius-full)',
                      padding: '4px 12px',
                      fontSize: '0.8rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      borderColor: isSelected ? 'var(--primary)' : 'var(--border)',
                    }}
                  >
                    <span>{ins.name}</span>
                    {isSelected ? <Check size={14} /> : <Plus size={14} />}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsSessionModalOpen(false)}
              disabled={submittingSession}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submittingSession}
            >
              {submittingSession ? 'Scheduling...' : 'Schedule Session'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
