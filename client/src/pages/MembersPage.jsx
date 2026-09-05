import React, { useState, useEffect } from 'react';
import { memberApi } from '../api/memberApi';
import { bookingApi } from '../api/bookingApi';
import { sessionApi } from '../api/sessionApi';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';
import { formatLocalDate, formatDisplayTime } from '../utils/date';
import {
  Users,
  Search,
  Edit2,
  Calendar,
  Mail,
  User,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Plus,
  CalendarPlus,
  Clock,
  MapPin,
} from 'lucide-react';

export function MembersPage() {
  const { isStaff } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Add Member Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addFormData, setAddFormData] = useState({
    name: '',
    email: '',
    membership_expiry: '',
  });
  const [addingMember, setAddingMember] = useState(false);
  const [addModalError, setAddModalError] = useState(null);

  // Edit Modal State
  const [editingMember, setEditingMember] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    membership_expiry: '',
  });
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Create Booking for Member Modal State
  const [bookingMember, setBookingMember] = useState(null);
  const [availableSessions, setAvailableSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [bookingModalError, setBookingModalError] = useState(null);

  // Global Toast Feedback
  const [successToast, setSuccessToast] = useState(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch members
  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await memberApi.getMembers({ search: debouncedSearch });
      setMembers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to fetch members.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isStaff) {
      fetchMembers();
    }
  }, [debouncedSearch, isStaff]);

  // Helper to compute membership status
  const getMembershipStatus = (expiryDateStr) => {
    if (!expiryDateStr) return { label: 'Unknown', isExpired: false, badgeClass: 'badge-muted', icon: AlertCircle };
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiry = new Date(`${expiryDateStr}T00:00:00`);
    expiry.setHours(0, 0, 0, 0);

    const diffDays = Math.round((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        label: 'Expired',
        isExpired: true,
        badgeClass: 'badge-danger',
        desc: `Expired on ${expiryDateStr}`,
        icon: AlertCircle,
      };
    } else if (diffDays <= 7) {
      return {
        label: diffDays === 0 ? 'Expires Today' : `Expires in ${diffDays}d`,
        isExpired: false,
        badgeClass: 'badge-warning',
        desc: `Approaching deadline (${expiryDateStr})`,
        icon: AlertTriangle,
      };
    } else {
      return {
        label: 'Active',
        isExpired: false,
        badgeClass: 'badge-success',
        desc: `Valid until ${expiryDateStr}`,
        icon: CheckCircle2,
      };
    }
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    setAddFormData({
      name: '',
      email: '',
      membership_expiry: formatLocalDate(d),
    });
    setAddModalError(null);
    setIsAddModalOpen(true);
  };

  // Submit Add Member Form
  const handleSaveAdd = async (e) => {
    e.preventDefault();
    if (!addFormData.name.trim()) {
      setAddModalError('Member name is required.');
      return;
    }
    if (!addFormData.email.trim()) {
      setAddModalError('Member email is required.');
      return;
    }
    if (!addFormData.membership_expiry.trim()) {
      setAddModalError('Membership expiry date is required (YYYY-MM-DD).');
      return;
    }

    try {
      setAddingMember(true);
      setAddModalError(null);
      await memberApi.createMember({
        name: addFormData.name.trim(),
        email: addFormData.email.trim(),
        membership_expiry: addFormData.membership_expiry.trim(),
      });

      setSuccessToast(`Member "${addFormData.name.trim()}" registered successfully!`);
      setTimeout(() => setSuccessToast(null), 4000);

      setIsAddModalOpen(false);
      fetchMembers();
    } catch (err) {
      setAddModalError(err.message || 'Failed to create member.');
    } finally {
      setAddingMember(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (member) => {
    setEditingMember(member);
    setEditFormData({
      name: member.name || '',
      email: member.email || '',
      membership_expiry: member.membership_expiry
        ? String(member.membership_expiry).slice(0, 10)
        : '',
    });
    setModalError(null);
  };

  // Submit Edit Form
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingMember) return;

    if (!editFormData.name.trim()) {
      setModalError('Member name is required.');
      return;
    }
    if (!editFormData.email.trim()) {
      setModalError('Member email is required.');
      return;
    }
    if (!editFormData.membership_expiry.trim()) {
      setModalError('Membership expiry date is required (YYYY-MM-DD).');
      return;
    }

    try {
      setSaving(true);
      setModalError(null);
      await memberApi.updateMember(editingMember.id, {
        name: editFormData.name.trim(),
        email: editFormData.email.trim(),
        membership_expiry: editFormData.membership_expiry.trim(),
      });

      setSuccessToast(`Member "${editFormData.name.trim()}" updated successfully!`);
      setTimeout(() => setSuccessToast(null), 4000);

      setEditingMember(null);
      fetchMembers();
    } catch (err) {
      setModalError(err.message || 'Failed to update member.');
    } finally {
      setSaving(false);
    }
  };

  // Open Booking Modal for Member
  const handleOpenBookingModal = async (member) => {
    const status = getMembershipStatus(member.membership_expiry);
    if (status.isExpired) {
      alert(`Cannot create booking for ${member.name}: Membership has expired. Please renew the member's expiry date first.`);
      return;
    }

    setBookingMember(member);
    setSelectedSessionId('');
    setBookingModalError(null);

    try {
      setLoadingSessions(true);
      const res = await sessionApi.getSessions();
      const sessions = Array.isArray(res) ? res : res?.data || [];
      // Filter to upcoming sessions only (session start must be in the future)
      const upcomingSessions = sessions.filter(
        (s) => new Date() < new Date(s.start_time || s.startTime)
      );
      // Sort upcoming sessions chronologically
      upcomingSessions.sort((a, b) => new Date(a.start_time || a.startTime) - new Date(b.start_time || b.startTime));
      setAvailableSessions(upcomingSessions);
    } catch (err) {
      setBookingModalError('Failed to retrieve active sessions: ' + (err.message || 'Unknown error'));
    } finally {
      setLoadingSessions(false);
    }
  };

  // Submit Booking
  const handleCreateMemberBooking = async (e) => {
    e.preventDefault();
    if (!bookingMember || !selectedSessionId) return;

    // Strict client-side check on membership expiry
    const status = getMembershipStatus(bookingMember.membership_expiry);
    if (status.isExpired) {
      setBookingModalError('Booking not allowed: Member membership has expired. Please renew membership first.');
      return;
    }

    try {
      setBookingInProgress(true);
      setBookingModalError(null);

      const res = await bookingApi.createBooking({
        session_id: Number(selectedSessionId),
        member_id: Number(bookingMember.id),
      });

      const bookingData = res?.data || res;
      const statusText = bookingData.status === 'WAITLISTED' ? 'Waitlisted' : 'Confirmed';

      setSuccessToast(`Booking created for ${bookingMember.name} (Status: ${statusText})!`);
      setTimeout(() => setSuccessToast(null), 4000);

      setBookingMember(null);
    } catch (err) {
      setBookingModalError(err.message || 'Failed to create booking for member.');
    } finally {
      setBookingInProgress(false);
    }
  };

  if (!isStaff) {
    return (
      <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
        <AlertCircle size={40} color="var(--danger)" style={{ marginBottom: '12px' }} />
        <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>
          Access Denied
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Only staff members are authorized to view and manage members.
        </p>
      </div>
    );
  }

  // Find currently selected session in modal for live capacity info
  const activeSelectedSession = availableSessions.find(
    (s) => String(s.id) === String(selectedSessionId)
  );
  const enrolledCount = activeSelectedSession?.bookings
    ? activeSelectedSession.bookings.filter((b) => b.status === 'BOOKED').length
    : (activeSelectedSession?.booked_count ?? 0);
  const sessionCapacity = activeSelectedSession?.capacity ?? 0;
  const isSessionFull = sessionCapacity > 0 && enrolledCount >= sessionCapacity;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Success Toast */}
      {successToast && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 18px',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            color: '#10b981',
            fontSize: '14px',
            fontWeight: '600',
          }}
        >
          <CheckCircle2 size={18} />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header */}
      <div
        className="page-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 className="page-title">Studio Members</h1>
            <span
              style={{
                fontSize: '12px',
                fontWeight: '700',
                padding: '3px 10px',
                borderRadius: '12px',
                background: 'rgba(99, 102, 241, 0.15)',
                color: 'var(--primary)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
              }}
            >
              {members.length} {members.length === 1 ? 'member' : 'members'}
            </span>
          </div>
          <p className="page-subtitle">
            View registered members, manage subscription renewals, or book class sessions.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={16} />
          Add Member
        </button>
      </div>

      {/* Filters Card */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              className="input"
              style={{ paddingLeft: '40px' }}
              placeholder="Search members by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="btn btn-secondary btn-sm"
              title="Clear search"
            >
              <RotateCcw size={14} />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 18px',
            borderRadius: '10px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: 'var(--danger)',
            fontSize: '14px',
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Content Table */}
      {loading ? (
        <LoadingSpinner message="Loading studio members..." />
      ) : members.length === 0 ? (
        <EmptyState
          icon={Users}
          title={searchTerm ? 'No members found' : 'No members registered'}
          message={
            searchTerm
              ? `No members matched "${searchTerm}". Try a different name or email.`
              : 'There are currently no members in the database. Click "+ Add Member" to register the first member.'
          }
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>ID</th>
                <th>Member</th>
                <th>Email Address</th>
                <th>Membership Expiry</th>
                <th>Status</th>
                <th style={{ textAlign: 'right', width: '180px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const status = getMembershipStatus(member.membership_expiry);
                const StatusIcon = status.icon;

                return (
                  <tr key={member.id}>
                    <td style={{ fontWeight: '700', color: 'var(--text-muted)' }}>
                      #{member.id}
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '700',
                            color: 'var(--primary)',
                            fontSize: '14px',
                          }}
                        >
                          {member.name ? member.name.charAt(0).toUpperCase() : 'M'}
                        </div>
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                          {member.name}
                        </div>
                      </div>
                    </td>

                    <td>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: 'var(--text-secondary)',
                          fontSize: '13px',
                        }}
                      >
                        <Mail size={14} color="var(--text-muted)" />
                        <span>{member.email}</span>
                      </div>
                    </td>

                    <td>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontWeight: '500',
                          color: 'var(--text-primary)',
                          fontSize: '13px',
                        }}
                      >
                        <Calendar size={14} color="var(--text-muted)" />
                        <span>
                          {member.membership_expiry
                            ? formatLocalDate(member.membership_expiry)
                            : '—'}
                        </span>
                      </div>
                    </td>

                    <td>
                      <span className={`badge ${status.badgeClass}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <StatusIcon size={12} />
                        {status.label}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                        {/* Book Session Action (Disabled if Expired) */}
                        {status.isExpired ? (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            disabled
                            title="Cannot book session: Member membership has expired. Renew membership first."
                            style={{
                              padding: '6px 12px',
                              opacity: 0.45,
                              cursor: 'not-allowed',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                            }}
                          >
                            <CalendarPlus size={14} />
                            Book
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenBookingModal(member)}
                            className="btn btn-primary btn-sm"
                            title="Create a class reservation for this member"
                            style={{
                              padding: '6px 12px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                            }}
                          >
                            <CalendarPlus size={14} />
                            Book
                          </button>
                        )}

                        {/* Edit Member Action */}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(member)}
                          className="btn btn-secondary btn-sm"
                          style={{
                            padding: '6px 12px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          <Edit2 size={14} />
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Book Session for Member Modal */}
      {bookingMember && (
        <Modal
          isOpen={true}
          onClose={() => setBookingMember(null)}
          title={`Book Class Session — ${bookingMember.name}`}
        >
          <form onSubmit={handleCreateMemberBooking}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Member banner */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border)',
                }}
              >
                <div>
                  <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '14px' }}>
                    {bookingMember.name}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                    {bookingMember.email}
                  </div>
                </div>
                <div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: '700',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: '#10b981',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                    }}
                  >
                    Valid until {formatLocalDate(bookingMember.membership_expiry)}
                  </span>
                </div>
              </div>

              {bookingModalError && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: 'var(--danger)',
                    fontSize: '13px',
                  }}
                >
                  <AlertCircle size={16} />
                  <span>{bookingModalError}</span>
                </div>
              )}

              {/* Session Selector */}
              <div className="form-group">
                <label className="label">
                  <Clock size={14} style={{ marginRight: '4px', verticalAlign: 'text-bottom' }} />
                  Select Session *
                </label>
                {loadingSessions ? (
                  <div style={{ padding: '10px', color: 'var(--text-muted)', fontSize: '13px' }}>
                    Loading available sessions...
                  </div>
                ) : (
                  <select
                    className="select"
                    required
                    value={selectedSessionId}
                    onChange={(e) => setSelectedSessionId(e.target.value)}
                  >
                    <option value="">Choose a scheduled session...</option>
                    {availableSessions.map((s) => {
                      const dateStr = formatLocalDate(s.start_time || s.startTime);
                      const timeStr = formatDisplayTime(s.start_time || s.startTime);
                      const sCapacity = s.capacity || 10;
                      return (
                        <option key={s.id} value={s.id}>
                          Session #{s.id} — {s.class?.title || 'Class'} ({dateStr} {timeStr}) | {s.room || 'Studio'} (Cap: {sCapacity})
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              {/* Live capacity & waitlist preview */}
              {activeSelectedSession && (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    background: isSessionFull ? 'rgba(245, 158, 11, 0.1)' : 'rgba(99, 102, 241, 0.08)',
                    border: isSessionFull
                      ? '1px solid rgba(245, 158, 11, 0.3)'
                      : '1px solid rgba(99, 102, 241, 0.25)',
                    color: isSessionFull ? 'var(--warning)' : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  {isSessionFull ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
                  <div>
                    {isSessionFull ? (
                      <span>
                        <strong>Session is at capacity ({enrolledCount}/{sessionCapacity}).</strong> The member will be placed on the <strong>WAITLIST</strong> and automatically promoted if a spot frees up.
                      </span>
                    ) : (
                      <span>
                        <strong>{sessionCapacity - enrolledCount} of {sessionCapacity} spots available.</strong> The reservation will be immediately <strong>CONFIRMED</strong>.
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  marginTop: '12px',
                  paddingTop: '16px',
                  borderTop: '1px solid var(--border)',
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={bookingInProgress}
                  onClick={() => setBookingMember(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={bookingInProgress || !selectedSessionId}
                >
                  {bookingInProgress ? 'Booking...' : isSessionFull ? 'Join Waitlist' : 'Confirm Booking'}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Member Modal */}
      {isAddModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsAddModalOpen(false)}
          title="Register New Member"
        >
          <form onSubmit={handleSaveAdd}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {addModalError && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: 'var(--danger)',
                    fontSize: '13px',
                  }}
                >
                  <AlertCircle size={16} />
                  <span>{addModalError}</span>
                </div>
              )}

              {/* Name Field */}
              <div className="form-group">
                <label className="label">
                  <User size={14} style={{ marginRight: '4px', verticalAlign: 'text-bottom' }} />
                  Full Name *
                </label>
                <input
                  type="text"
                  className="input"
                  required
                  value={addFormData.name}
                  onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })}
                  placeholder="e.g. Sarah Connor"
                />
              </div>

              {/* Email Field */}
              <div className="form-group">
                <label className="label">
                  <Mail size={14} style={{ marginRight: '4px', verticalAlign: 'text-bottom' }} />
                  Email Address *
                </label>
                <input
                  type="email"
                  className="input"
                  required
                  value={addFormData.email}
                  onChange={(e) => setAddFormData({ ...addFormData, email: e.target.value })}
                  placeholder="e.g. sarah.connor@example.com"
                />
              </div>

              {/* Membership Expiry Field */}
              <div className="form-group">
                <label className="label">
                  <Calendar size={14} style={{ marginRight: '4px', verticalAlign: 'text-bottom' }} />
                  Membership Expiry Date (YYYY-MM-DD) *
                </label>
                <input
                  type="date"
                  className="input"
                  required
                  value={addFormData.membership_expiry}
                  onChange={(e) =>
                    setAddFormData({ ...addFormData, membership_expiry: e.target.value })
                  }
                />
              </div>

              {/* Quick Preset Buttons */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '11px', padding: '4px 8px' }}
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 30);
                    setAddFormData({
                      ...addFormData,
                      membership_expiry: formatLocalDate(d),
                    });
                  }}
                >
                  +30 Days from Today
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '11px', padding: '4px 8px' }}
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 90);
                    setAddFormData({
                      ...addFormData,
                      membership_expiry: formatLocalDate(d),
                    });
                  }}
                >
                  +90 Days from Today
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '11px', padding: '4px 8px' }}
                  onClick={() => {
                    const d = new Date();
                    d.setFullYear(d.getFullYear() + 1);
                    setAddFormData({
                      ...addFormData,
                      membership_expiry: formatLocalDate(d),
                    });
                  }}
                >
                  +1 Year from Today
                </button>
              </div>

              {/* Actions */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  marginTop: '12px',
                  paddingTop: '16px',
                  borderTop: '1px solid var(--border)',
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={addingMember}
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={addingMember}>
                  {addingMember ? 'Registering...' : 'Register Member'}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Member Modal */}
      {editingMember && (
        <Modal
          isOpen={true}
          onClose={() => setEditingMember(null)}
          title={`Edit Member #${editingMember.id}`}
        >
          <form onSubmit={handleSaveEdit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {modalError && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: 'var(--danger)',
                    fontSize: '13px',
                  }}
                >
                  <AlertCircle size={16} />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Name Field */}
              <div className="form-group">
                <label className="label">
                  <User size={14} style={{ marginRight: '4px', verticalAlign: 'text-bottom' }} />
                  Full Name *
                </label>
                <input
                  type="text"
                  className="input"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  placeholder="e.g. John Doe"
                />
              </div>

              {/* Email Field */}
              <div className="form-group">
                <label className="label">
                  <Mail size={14} style={{ marginRight: '4px', verticalAlign: 'text-bottom' }} />
                  Email Address *
                </label>
                <input
                  type="email"
                  className="input"
                  required
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  placeholder="e.g. john@example.com"
                />
              </div>

              {/* Membership Expiry Field */}
              <div className="form-group">
                <label className="label">
                  <Calendar size={14} style={{ marginRight: '4px', verticalAlign: 'text-bottom' }} />
                  Membership Expiry Date (YYYY-MM-DD) *
                </label>
                <input
                  type="date"
                  className="input"
                  required
                  value={editFormData.membership_expiry}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, membership_expiry: e.target.value })
                  }
                />
                <span
                  style={{
                    display: 'block',
                    marginTop: '6px',
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                  }}
                >
                  Extending or updating this date to a new date atomically resets any dismissed alerts.
                </span>
              </div>

              {/* Quick 30-Day / 90-Day Extension Buttons */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '11px', padding: '4px 8px' }}
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 30);
                    setEditFormData({
                      ...editFormData,
                      membership_expiry: formatLocalDate(d),
                    });
                  }}
                >
                  +30 Days from Today
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '11px', padding: '4px 8px' }}
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 90);
                    setEditFormData({
                      ...editFormData,
                      membership_expiry: formatLocalDate(d),
                    });
                  }}
                >
                  +90 Days from Today
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '11px', padding: '4px 8px' }}
                  onClick={() => {
                    const d = new Date();
                    d.setFullYear(d.getFullYear() + 1);
                    setEditFormData({
                      ...editFormData,
                      membership_expiry: formatLocalDate(d),
                    });
                  }}
                >
                  +1 Year from Today
                </button>
              </div>

              {/* Actions */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  marginTop: '12px',
                  paddingTop: '16px',
                  borderTop: '1px solid var(--border)',
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={saving}
                  onClick={() => setEditingMember(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
