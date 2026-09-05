import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { classApi } from '../api/classApi';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import {
  Layers,
  Plus,
  Search,
  Edit2,
  Archive,
  RotateCcw,
  Calendar,
  Clock,
  Users,
  AlertCircle,
} from 'lucide-react';

export function ClassesPage() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [includeArchived, setIncludeArchived] = useState(true);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    discipline: 'YOGA',
    duration_minutes: 60,
    default_capacity: 15,
    description: '',
  });
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Archive / Restore Confirm
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'archive' | 'restore', cls: object }

  const fetchClasses = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await classApi.getClasses(includeArchived);
      setClasses(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to fetch classes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, [includeArchived]);

  const openCreateModal = () => {
    setEditingClass(null);
    setFormData({
      title: '',
      discipline: 'YOGA',
      duration_minutes: 60,
      default_capacity: 15,
      description: '',
    });
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const openEditModal = (cls) => {
    setEditingClass(cls);
    setFormData({
      title: cls.title || '',
      discipline: cls.discipline || 'YOGA',
      duration_minutes: cls.default_duration ?? cls.defaultDuration ?? cls.duration_minutes ?? 60,
      default_capacity: cls.default_capacity ?? cls.defaultCapacity ?? 15,
      description: cls.description || '',
    });
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setFormError('Class title is required.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);
      const payload = {
        title: formData.title.trim(),
        discipline: formData.discipline,
        default_duration: Number(formData.duration_minutes),
        default_capacity: Number(formData.default_capacity),
        description: formData.description ? formData.description.trim() : null,
      };

      if (editingClass) {
        await classApi.updateClass(editingClass.id, payload);
      } else {
        await classApi.createClass(payload);
      }
      setIsFormModalOpen(false);
      fetchClasses();
    } catch (err) {
      setFormError(err.message || 'Failed to save class details.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    try {
      setSubmitting(true);
      if (confirmAction.type === 'archive') {
        await classApi.archiveClass(confirmAction.cls.id);
      } else {
        await classApi.restoreClass(confirmAction.cls.id);
      }
      setConfirmAction(null);
      fetchClasses();
    } catch (err) {
      alert(err.message || `Failed to ${confirmAction.type} class.`);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredClasses = classes.filter((c) =>
    c.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.discipline?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Class Management</h1>
          <p className="page-subtitle">
            Configure studio class definitions, capacity thresholds, disciplines, and lifecycle states.
          </p>
        </div>

        <button onClick={openCreateModal} className="btn btn-primary">
          <Plus size={18} />
          <span>New Class</span>
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="filter-bar">
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            className="input-field"
            placeholder="Search classes by title or discipline..."
            style={{ paddingLeft: '36px' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
            style={{ accentColor: 'var(--primary)' }}
          />
          <span>Include Archived Classes</span>
        </label>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading studio classes..." />
      ) : error ? (
        <div className="card" style={{ textAlign: 'center', padding: '36px', color: 'var(--danger)' }}>
          {error}
        </div>
      ) : filteredClasses.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No classes found"
          description="Create your first studio class or adjust the search filter."
          actionLabel="Create Class"
          onAction={openCreateModal}
        />
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Class Name & Discipline</th>
                <th>Duration</th>
                <th>Default Capacity</th>
                <th>Status</th>
                <th>Created</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClasses.map((cls) => {
                const isArchived = Boolean(cls.is_archived ?? cls.isArchived);
                const duration = cls.default_duration ?? cls.defaultDuration ?? 60;
                const capacity = cls.default_capacity ?? cls.defaultCapacity ?? 15;

                return (
                  <tr key={cls.id}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span
                          style={{
                            fontWeight: '600',
                            color: 'var(--text-primary)',
                            fontSize: '0.95rem',
                            cursor: 'pointer',
                          }}
                          onClick={() => navigate(`/classes/${cls.id}`)}
                        >
                          {cls.title}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#818CF8', fontWeight: '600' }}>
                          {cls.discipline}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={14} style={{ color: 'var(--text-muted)' }} />
                        <span>{duration} mins</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Users size={14} style={{ color: 'var(--text-muted)' }} />
                        <span>{capacity} members</span>
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={isArchived ? 'ARCHIVED' : 'ACTIVE'} />
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {cls.createdAt ? new Date(cls.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          onClick={() => navigate(`/classes/${cls.id}`)}
                          className="btn btn-secondary btn-sm"
                          title="View Details & Sessions"
                        >
                          <Calendar size={14} />
                          <span>Sessions</span>
                        </button>
                        <button
                          onClick={() => openEditModal(cls)}
                          className="btn btn-secondary btn-sm"
                          title="Edit Class"
                        >
                          <Edit2 size={14} />
                        </button>
                        {isArchived ? (
                          <button
                            onClick={() => setConfirmAction({ type: 'restore', cls })}
                            className="btn btn-secondary btn-sm"
                            title="Restore Class"
                            style={{ color: 'var(--success)' }}
                          >
                            <RotateCcw size={14} />
                          </button>
                        ) : (
                          <button
                            onClick={() => setConfirmAction({ type: 'archive', cls })}
                            className="btn btn-secondary btn-sm"
                            title="Archive Class"
                            style={{ color: 'var(--danger)' }}
                          >
                            <Archive size={14} />
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

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingClass ? `Edit Class: ${editingClass.title}` : 'Create New Class'}
      >
        <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
              Class Title *
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Morning Vinyasa Flow"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>
                Discipline *
              </label>
              <select
                className="select-field"
                value={formData.discipline}
                onChange={(e) => setFormData({ ...formData, discipline: e.target.value })}
              >
                <option value="YOGA">YOGA</option>
                <option value="PILATES">PILATES</option>
                <option value="HIIT">HIIT</option>
                <option value="DANCE">DANCE</option>
                <option value="CYCLING">CYCLING</option>
                <option value="BOXING">BOXING</option>
                <option value="STRENGTH">STRENGTH</option>
              </select>
            </div>

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
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>
              Default Capacity *
            </label>
            <input
              type="number"
              className="input-field"
              min="1"
              max="200"
              value={formData.default_capacity}
              onChange={(e) => setFormData({ ...formData, default_capacity: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>
              Description
            </label>
            <textarea
              className="input-field"
              rows="3"
              placeholder="Detailed description of the workout, difficulty level, prerequisites..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsFormModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : editingClass ? 'Save Changes' : 'Create Class'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Archive / Restore */}
      <ConfirmDialog
        isOpen={Boolean(confirmAction)}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
        title={confirmAction?.type === 'archive' ? 'Archive Class' : 'Restore Class'}
        message={
          confirmAction?.type === 'archive'
            ? `Are you sure you want to archive "${confirmAction?.cls?.title}"? Existing scheduled sessions will remain, but new sessions cannot be scheduled from an archived class.`
            : `Are you sure you want to restore "${confirmAction?.cls?.title}"? The class will become active and available for session scheduling.`
        }
        confirmLabel={confirmAction?.type === 'archive' ? 'Archive' : 'Restore'}
        confirmVariant={confirmAction?.type === 'archive' ? 'danger' : 'primary'}
      />
    </div>
  );
}
