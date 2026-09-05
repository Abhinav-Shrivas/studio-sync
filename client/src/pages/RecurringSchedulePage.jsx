import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { classApi } from '../api/classApi';
import { sessionApi } from '../api/sessionApi';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import {
  Repeat,
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Check,
  Plus,
} from 'lucide-react';
import { getTimezoneOffsetString } from '../utils/date';

const ACTIVE_INSTRUCTORS = [
  { id: '2', name: 'Priya Sharma' },
  { id: '3', name: 'Raj Patel' },
  { id: '4', name: 'Anita Desai' },
];

export function RecurringSchedulePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const classIdParam = searchParams.get('class_id');

  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const [formData, setFormData] = useState({
    class_id: classIdParam || '',
    start_date: '',
    end_date: '',
    weekday: 'MONDAY',
    start_time: '09:00',
    room: 'Studio A',
    primary_instructor_id: '2',
    capacity: 15,
    co_instructor_ids: [],
  });

  useEffect(() => {
    const loadClasses = async () => {
      try {
        setLoading(true);
        const data = await classApi.getClasses(false);
        const validClasses = Array.isArray(data) ? data : [];
        setClasses(validClasses);

        if (validClasses.length > 0) {
          const selected = classIdParam
            ? validClasses.find((c) => String(c.id) === String(classIdParam))
            : validClasses[0];
          const target = selected || validClasses[0];

          setFormData((prev) => ({
            ...prev,
            class_id: target.id,
            capacity: target.default_capacity || target.defaultCapacity || 15,
          }));
        }
      } catch (err) {
        setError(err.message || 'Failed to load active classes.');
      } finally {
        setLoading(false);
      }
    };

    loadClasses();
  }, [classIdParam]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.class_id || !formData.start_date || !formData.end_date || !formData.start_time) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setResult(null);

      const tzOffset = getTimezoneOffsetString();
      const res = await sessionApi.generateRecurring({
        class_id: Number(formData.class_id),
        start_date: formData.start_date,
        end_date: formData.end_date,
        weekday: formData.weekday,
        start_time: formData.start_time,
        room: formData.room,
        primary_instructor_id: Number(formData.primary_instructor_id),
        capacity: Number(formData.capacity),
        co_instructor_ids: formData.co_instructor_ids.map(Number),
        timezone_offset: tzOffset,
      });

      setResult(res);
    } catch (err) {
      setError(err.message || 'Failed to generate recurring schedule.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Preparing recurring scheduler..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '900px', margin: '0 auto' }}>
      <div>
        <Link
          to="/sessions"
          className="btn btn-secondary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}
        >
          <ArrowLeft size={16} />
          <span>Back to Sessions</span>
        </Link>

        <div className="page-header" style={{ marginBottom: '0' }}>
          <div>
            <h1 className="page-title">Generate Recurring Schedule</h1>
            <p className="page-subtitle">
              Bulk-generate weekly recurring class slots across an entire calendar season with automatic conflict detection.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'var(--danger-light)',
            border: '1px solid var(--danger)',
            borderRadius: 'var(--radius-md)',
            color: '#FCA5A5',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertTriangle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Generation Result Banner */}
      {result && (
        <div
          className="card"
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CheckCircle2 size={24} style={{ color: 'var(--success)' }} />
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                Recurring Schedule Generation Completed
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Total occurrences considered: {result.summary?.total || 0}
              </p>
            </div>
          </div>

          <div className="grid-cols-2" style={{ gap: '12px' }}>
            <div
              style={{
                backgroundColor: 'var(--bg-card)',
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
              }}
            >
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Successfully Created</span>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--success)' }}>
                {result.summary?.created_count ?? result.created?.length ?? 0}
              </div>
            </div>

            <div
              style={{
                backgroundColor: 'var(--bg-card)',
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
              }}
            >
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Skipped / Conflicts</span>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: result.summary?.skipped_count > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                {result.summary?.skipped_count ?? result.skipped?.length ?? 0}
              </div>
            </div>
          </div>

          {result.skipped && result.skipped.length > 0 && (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              <strong>Skipped Occurrences:</strong>
              <ul style={{ paddingLeft: '20px', marginTop: '6px' }}>
                {result.skipped.map((s, idx) => (
                  <li key={idx}>
                    {s.date || s.startTime}: {s.reason || 'Scheduling conflict'}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={() => navigate('/sessions')}
            className="btn btn-primary"
            style={{ width: 'fit-content' }}
          >
            <span>View Updated Timetable</span>
            <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* Scheduling Form */}
      <div className="card">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>
              Target Class *
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
                  capacity: found?.defaultCapacity || formData.capacity,
                });
              }}
              required
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.discipline}, {c.durationMinutes}m)
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>
                Season Start Date *
              </label>
              <input
                type="date"
                className="input-field"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>
                Season End Date *
              </label>
              <input
                type="date"
                className="input-field"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>
                Repeating Weekday *
              </label>
              <select
                className="select-field"
                value={formData.weekday}
                onChange={(e) => setFormData({ ...formData, weekday: e.target.value })}
              >
                <option value="MONDAY">Every Monday</option>
                <option value="TUESDAY">Every Tuesday</option>
                <option value="WEDNESDAY">Every Wednesday</option>
                <option value="THURSDAY">Every Thursday</option>
                <option value="FRIDAY">Every Friday</option>
                <option value="SATURDAY">Every Saturday</option>
                <option value="SUNDAY">Every Sunday</option>
              </select>
            </div>

            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>
                Session Start Time *
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>
                Room / Studio *
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
                Session Capacity *
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
                  co_instructor_ids: formData.co_instructor_ids.filter((ciId) => String(ciId) !== newPrimary),
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
              Select additional instructors assisting with each recurring occurrence (cannot be the primary instructor).
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {ACTIVE_INSTRUCTORS.filter((ins) => String(ins.id) !== String(formData.primary_instructor_id)).map((ins) => {
                const isSelected = formData.co_instructor_ids.some((ciId) => String(ciId) === String(ins.id));
                return (
                  <button
                    key={ins.id}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setFormData({
                          ...formData,
                          co_instructor_ids: formData.co_instructor_ids.filter((ciId) => String(ciId) !== String(ins.id)),
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/sessions')}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              <Sparkles size={16} />
              <span>{submitting ? 'Generating Occurrences...' : 'Generate Recurring Occurrences'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
