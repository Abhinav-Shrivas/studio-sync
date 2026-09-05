import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sessionApi } from '../api/sessionApi';
import { classApi } from '../api/classApi';
import { instructorApi } from '../api/instructorApi';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import {
  toLocalISOString,
  formatLocalDate,
  formatLocalTime,
  formatDisplayTime,
} from '../utils/date';
import {
  Calendar,
  Clock,
  Users,
  Plus,
  Repeat,
  Trash2,
  Edit2,
  UserCheck,
  AlertCircle,
  Check,
  CheckCircle2,
  X,
} from 'lucide-react';

const ACTIVE_INSTRUCTORS = [
  { id: '2', name: 'Priya Sharma' },
  { id: '3', name: 'Raj Patel' },
  { id: '4', name: 'Anita Desai' },
];

export function SessionsPage() {
  const navigate = useNavigate();
  const { isStaff, user } = useAuth();

  const [sessions, setSessions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters (room filter removed per request)
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [classFilter, setClassFilter] = useState('');

  // New Session Modal (Staff Only)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    class_id: '',
    date: '',
    start_time: '10:00',
    room: 'Studio A',
    primary_instructor_id: '2',
    capacity: 15,
    co_instructor_ids: [],
  });
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Edit Session Modal (Staff Only)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [editForm, setEditForm] = useState({
    class_id: '',
    date: '',
    start_time: '10:00',
    room: '',
    primary_instructor_id: '2',
    capacity: 15,
    duration: 60,
    co_instructor_ids: [],
  });
  const [editError, setEditError] = useState(null);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Delete Confirm
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [successNotice, setSuccessNotice] = useState(null);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      const filters = {};
      if (fromDate) filters.from_date = fromDate;
      if (toDate) filters.to_date = toDate;
      if (classFilter) filters.class_id = classFilter;

      const [sessionsData, classesData] = await Promise.all([
        sessionApi.getSessions(filters),
        isStaff ? classApi.getClasses(false) : instructorApi.getActiveClasses(),
      ]);

      setSessions(Array.isArray(sessionsData) ? sessionsData : []);
      if (Array.isArray(classesData) && classesData.length > 0) {
        setClasses(classesData);
        if (!formData.class_id) {
          setFormData((prev) => ({
            ...prev,
            class_id: classesData[0].id,
            capacity: classesData[0].default_capacity || classesData[0].defaultCapacity || 15,
          }));
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch sessions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [fromDate, toDate, classFilter]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.class_id || !formData.date || !formData.start_time) {
      setFormError('Class, date, and start time are required.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);
      const startDateTime = toLocalISOString(formData.date, formData.start_time);

      await sessionApi.createSession({
        class_id: Number(formData.class_id),
        start_time: startDateTime,
        room: formData.room.trim(),
        primary_instructor_id: Number(formData.primary_instructor_id),
        capacity: Number(formData.capacity),
        co_instructor_ids: formData.co_instructor_ids.map(Number),
      });

      setIsCreateModalOpen(false);
      setFormData({
        class_id: classes[0]?.id || '',
        date: '',
        start_time: '10:00',
        room: 'Studio A',
        primary_instructor_id: '2',
        capacity: 15,
        co_instructor_ids: [],
      });
      setSuccessNotice('Session scheduled successfully.');
      fetchSessions();
    } catch (err) {
      setFormError(err.message || 'Failed to create session.');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (sess) => {
    setEditingSession(sess);
    const dateStr = formatLocalDate(sess.start_time || sess.startTime);
    const timeStr = formatLocalTime(sess.start_time || sess.startTime);

    const coIds = (sess.coInstructors || sess.co_instructors || []).map((ci) =>
      String(ci.id || ci.instructorId)
    );

    setEditForm({
      class_id: sess.class_id || sess.class?.id || '',
      date: dateStr !== '—' ? dateStr : '',
      start_time: timeStr,
      room: sess.room || 'Studio A',
      primary_instructor_id: String(sess.primary_instructor_id || sess.primaryInstructor?.id || '2'),
      capacity: sess.capacity || 15,
      duration: sess.duration || 60,
      co_instructor_ids: coIds,
    });
    setEditError(null);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.date || !editForm.start_time) {
      setEditError('Date and start time are required.');
      return;
    }

    try {
      setSubmittingEdit(true);
      setEditError(null);
      const startDateTime = toLocalISOString(editForm.date, editForm.start_time);

      await sessionApi.updateSession(editingSession.id, {
        class_id: Number(editForm.class_id),
        room: editForm.room.trim(),
        start_time: startDateTime,
        duration: Number(editForm.duration),
        capacity: Number(editForm.capacity),
        primary_instructor_id: Number(editForm.primary_instructor_id),
        co_instructor_ids: editForm.co_instructor_ids.map(Number),
      });

      const updatedId = editingSession.id;
      setIsEditModalOpen(false);
      setEditingSession(null);
      setSuccessNotice(`Session #${updatedId} details updated successfully.`);
      fetchSessions();
    } catch (err) {
      setEditError(err.message || 'Failed to update session.');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDeleteSession = async () => {
    if (!sessionToDelete) return;
    try {
      setSubmitting(true);
      setDeleteError(null);
      const deletedId = sessionToDelete.id;
      const classTitle = sessionToDelete.class?.title || 'Class';
      await sessionApi.deleteSession(sessionToDelete.id);
      setSessionToDelete(null);
      setSuccessNotice(`Session #${deletedId} (${classTitle}) was successfully deleted.`);
      fetchSessions();
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete session.');
      alert(err.message || 'Failed to delete session.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {isStaff ? 'Session Schedule' : 'My Assigned Sessions'}
          </h1>
          <p className="page-subtitle">
            {isStaff
              ? 'View studio timetable, edit upcoming sessions, create one-off sessions, or generate recurring schedules.'
              : 'Sessions where you are assigned as Primary or Co-Instructor.'}
          </p>
        </div>

        {isStaff && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link to="/sessions/recurring" className="btn btn-secondary">
              <Repeat size={16} />
              <span>Recurring Schedule</span>
            </Link>
            <button onClick={() => setIsCreateModalOpen(true)} className="btn btn-primary">
              <Plus size={16} />
              <span>Schedule Session</span>
            </button>
          </div>
        )}
      </div>

      {/* Success Notification Banner */}
      {successNotice && (
        <div
          style={{
            padding: '14px 18px',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid var(--success)',
            borderRadius: 'var(--radius-md)',
            color: '#34D399',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            fontSize: '0.9rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <span>{successNotice}</span>
          </div>
          <button
            onClick={() => setSuccessNotice(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#34D399',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Filter toolbar */}
      <div className="filter-bar" style={{ flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>From:</label>
          <input
            type="date"
            className="input-field"
            style={{ width: 'auto' }}
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>To:</label>
          <input
            type="date"
            className="input-field"
            style={{ width: 'auto' }}
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>

        {classes.length > 0 && (
          <select
            className="select-field"
            style={{ width: 'auto', minWidth: '180px' }}
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
          >
            <option value="">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        )}

        {(fromDate || toDate || classFilter) && (
          <button
            onClick={() => {
              setFromDate('');
              setToDate('');
              setClassFilter('');
            }}
            className="btn btn-secondary btn-sm"
          >
            Clear Filters
          </button>
        )}
      </div>

      {loading ? (
        <LoadingSpinner message="Retrieving sessions..." />
      ) : error ? (
        <div className="card" style={{ textAlign: 'center', padding: '36px', color: 'var(--danger)' }}>
          {error}
        </div>
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No sessions found"
          description="There are no sessions matching the selected filter criteria."
          actionLabel={isStaff ? 'Schedule Session' : undefined}
          onAction={isStaff ? () => setIsCreateModalOpen(true) : undefined}
        />
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Class</th>
                <th>Date & Time</th>
                <th>Room</th>
                <th>Primary Instructor</th>
                <th>Co-Instructors</th>
                <th>Capacity</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((sess) => {
                const coInstructors = sess.coInstructors || [];
                const start = new Date(sess.start_time || sess.startTime);
                const dateStr = formatLocalDate(sess.start_time || sess.startTime);
                const timeStr = formatDisplayTime(sess.start_time || sess.startTime);
                const durationMin = sess.duration || sess.duration_minutes || sess.class?.default_duration || 60;
                const now = new Date();
                const endTime = new Date(start.getTime() + durationMin * 60000);
                const sessionStatus = now < start ? 'SCHEDULED' : now <= endTime ? 'IN_PROGRESS' : 'COMPLETED';
                const canEdit = isStaff && now < start;

                return (
                  <tr key={sess.id}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span
                          style={{
                            fontWeight: '600',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                          }}
                          onClick={() => navigate(`/sessions/${sess.id}`)}
                        >
                          {sess.class?.title || `Class #${sess.classId || sess.class_id}`}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#818CF8' }}>
                          {sess.class?.discipline || 'FITNESS'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                        {dateStr}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {timeStr} ({durationMin} mins)
                      </div>
                    </td>
                    <td>{sess.room || 'Studio A'}</td>
                    <td>
                      <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>
                        {sess.primaryInstructor?.name || sess.primary_instructor_id || 'Assigned'}
                      </span>
                    </td>
                    <td>
                      {coInstructors.length > 0 ? (
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          {coInstructors.map((c) => c.name || c.user?.name || `ID ${c.instructorId || c.id}`).join(', ')}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                        {sess.capacity} members
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={sessionStatus} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          onClick={() => navigate(`/sessions/${sess.id}`)}
                          className="btn btn-secondary btn-sm"
                          title="View Attendance & Roster"
                        >
                          <UserCheck size={14} />
                          <span>Roster</span>
                        </button>
                        {isStaff && (
                          <button
                            onClick={() => openEditModal(sess)}
                            className="btn btn-secondary btn-sm"
                            title={canEdit ? 'Edit Session' : 'Cannot edit session after start time'}
                            disabled={!canEdit}
                          >
                            <Edit2 size={14} />
                          </button>
                        )}
                        {isStaff && (
                          <button
                            onClick={() => setSessionToDelete(sess)}
                            className="btn btn-secondary btn-sm"
                            title="Delete Session"
                            style={{ color: 'var(--danger)' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* New Session Modal */}
      {isStaff && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Schedule New Session"
        >
          <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {formError && (
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
                <span>{formError}</span>
              </div>
            )}

            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>
                Select Class *
              </label>
              <select
                className="select-field"
                value={formData.class_id}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  const found = classes.find((c) => String(c.id) === String(selectedId));
                  setFormData({
                    ...formData,
                    class_id: selectedId,
                    capacity: found?.default_capacity || found?.defaultCapacity || formData.capacity,
                  });
                }}
                required
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.discipline})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>
                  Session Date *
                </label>
                <input
                  type="date"
                  className="input-field"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
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
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
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
                  value={formData.room}
                  onChange={(e) => setFormData({ ...formData, room: e.target.value })}
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
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
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
                value={formData.primary_instructor_id}
                onChange={(e) => {
                  const newPrimary = e.target.value;
                  setFormData({
                    ...formData,
                    primary_instructor_id: newPrimary,
                    co_instructor_ids: formData.co_instructor_ids.filter((id) => String(id) !== newPrimary),
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
                {ACTIVE_INSTRUCTORS.filter((ins) => String(ins.id) !== String(formData.primary_instructor_id)).map((ins) => {
                  const isSelected = formData.co_instructor_ids.some((id) => String(id) === String(ins.id));
                  return (
                    <button
                      key={ins.id}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setFormData({
                            ...formData,
                            co_instructor_ids: formData.co_instructor_ids.filter((id) => String(id) !== String(ins.id)),
                          });
                        } else {
                          setFormData({
                            ...formData,
                            co_instructor_ids: [...formData.co_instructor_ids, ins.id],
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
                onClick={() => setIsCreateModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Creating...' : 'Schedule Session'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Session Modal */}
      {isStaff && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={`Edit Session #${editingSession?.id}`}
        >
          <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {editError && (
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
                <span>{editError}</span>
              </div>
            )}

            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>
                Class
              </label>
              <select
                className="select-field"
                value={editForm.class_id}
                onChange={(e) => setEditForm({ ...editForm, class_id: e.target.value })}
                required
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.discipline})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>
                  Session Date *
                </label>
                <input
                  type="date"
                  className="input-field"
                  value={editForm.date}
                  onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
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
                  value={editForm.start_time}
                  onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })}
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
                  value={editForm.room}
                  onChange={(e) => setEditForm({ ...editForm, room: e.target.value })}
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
                  value={editForm.capacity}
                  onChange={(e) => setEditForm({ ...editForm, capacity: e.target.value })}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>
                  Duration (minutes) *
                </label>
                <input
                  type="number"
                  className="input-field"
                  min="15"
                  max="240"
                  step="5"
                  value={editForm.duration}
                  onChange={(e) => setEditForm({ ...editForm, duration: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>
                  Primary Instructor *
                </label>
                <select
                  className="select-field"
                  value={editForm.primary_instructor_id}
                  onChange={(e) => {
                    const newPrimary = e.target.value;
                    setEditForm({
                      ...editForm,
                      primary_instructor_id: newPrimary,
                      co_instructor_ids: editForm.co_instructor_ids.filter((id) => String(id) !== newPrimary),
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
            </div>

            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600' }}>
                Assign Co-Instructors (Optional)
              </label>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Select additional instructors assisting with this session (cannot be the primary instructor).
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {ACTIVE_INSTRUCTORS.filter((ins) => String(ins.id) !== String(editForm.primary_instructor_id)).map((ins) => {
                  const isSelected = editForm.co_instructor_ids.some((id) => String(id) === String(ins.id));
                  return (
                    <button
                      key={ins.id}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setEditForm({
                            ...editForm,
                            co_instructor_ids: editForm.co_instructor_ids.filter((id) => String(id) !== String(ins.id)),
                          });
                        } else {
                          setEditForm({
                            ...editForm,
                            co_instructor_ids: [...editForm.co_instructor_ids, ins.id],
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
                onClick={() => setIsEditModalOpen(false)}
                disabled={submittingEdit}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submittingEdit}
              >
                {submittingEdit ? 'Saving Changes...' : 'Save Session'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(sessionToDelete)}
        onClose={() => {
          setSessionToDelete(null);
          setDeleteError(null);
        }}
        onConfirm={handleDeleteSession}
        title="Delete Session"
        message={`Are you sure you want to delete session #${sessionToDelete?.id} (${sessionToDelete?.class?.title || 'Class'})? This action cannot be undone.`}
        confirmLabel={submitting ? 'Deleting...' : 'Delete Session'}
        confirmVariant="danger"
        loading={submitting}
        error={deleteError}
      />
    </div>
  );
}
