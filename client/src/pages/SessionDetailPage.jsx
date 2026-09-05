import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sessionApi } from '../api/sessionApi';
import { bookingApi } from '../api/bookingApi';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Download,
  CheckCircle,
  CheckCircle2,
  XCircle,
  UserPlus,
  Trash2,
  ArrowLeft,
  UserCheck,
  AlertCircle,
  MessageSquare,
  Ban,
  X,
} from 'lucide-react';
import { formatLocalDate, formatDisplayTime } from '../utils/date';

export function SessionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isStaff, user } = useAuth();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Settlement Modal with Inline Note
  const [settleModal, setSettleModal] = useState(null); // { booking: object, status: 'ATTENDED' | 'NO_SHOW' }
  const [settleNote, setSettleNote] = useState('');
  const [submittingSettle, setSubmittingSettle] = useState(false);

  // Add Co-instructor Modal (Staff Only)
  const [isCoModalOpen, setIsCoModalOpen] = useState(false);
  const [selectedInstructorId, setSelectedInstructorId] = useState('3');
  const [submittingCo, setSubmittingCo] = useState(false);

  // Cancel Booking Modal (Staff Only)
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [promotionNotice, setPromotionNotice] = useState(null);

  // Remove Co-Instructor Modal (Staff Only)
  const [coToRemove, setCoToRemove] = useState(null);
  const [removingCo, setRemovingCo] = useState(false);

  const handleConfirmCancel = async () => {
    if (!bookingToCancel) return;
    try {
      setCancelling(true);
      setActionError(null);
      setPromotionNotice(null);
      const res = await bookingApi.cancelBooking(bookingToCancel.id);
      if (res?.promotedBooking) {
        setPromotionNotice(
          `Waitlist promotion triggered: Member #${res.promotedBooking.memberId || res.promotedBooking.member_id} was automatically moved from WAITLIST to BOOKED status!`
        );
      } else {
        setPromotionNotice('Booking successfully cancelled.');
      }
      setBookingToCancel(null);
      fetchSession(false);
    } catch (err) {
      setActionError(err.message || 'Failed to cancel booking.');
    } finally {
      setCancelling(false);
    }
  };

  const fetchSession = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);
      const [sessionData, bookingsData] = await Promise.all([
        sessionApi.getSessionById(id),
        bookingApi.getBookings({ session_id: id, limit: 100 }),
      ]);
      const bookingsList = Array.isArray(bookingsData)
        ? bookingsData
        : bookingsData?.bookings || [];
      setSession({
        ...sessionData,
        bookings: bookingsList,
      });
    } catch (err) {
      setError(err.message || 'Failed to load session roster.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession(true);
  }, [id]);

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      setActionError(null);
      await sessionApi.exportAttendanceCsv(id);
    } catch (err) {
      setActionError(err.message || 'Failed to export attendance CSV.');
    } finally {
      setExporting(false);
    }
  };

  const openSettleModal = (booking, status) => {
    setSettleModal({ booking, status });
    setSettleNote('');
    setActionError(null);
  };

  const handleConfirmSettle = async (e) => {
    e.preventDefault();
    if (!settleModal) return;

    try {
      setSubmittingSettle(true);
      setActionError(null);
      await bookingApi.settleAttendance(
        settleModal.booking.id,
        settleModal.status,
        isStaff && settleNote.trim() ? settleNote.trim() : undefined
      );
      const memberName = settleModal.booking?.member?.name || `Member #${settleModal.booking?.memberId || settleModal.booking?.member_id}`;
      setPromotionNotice(`Attendance successfully recorded as ${settleModal.status} for ${memberName}.`);
      setSettleModal(null);
      fetchSession(false);
    } catch (err) {
      setActionError(err.message || `Failed to mark attendance as ${settleModal.status}.`);
    } finally {
      setSubmittingSettle(false);
    }
  };

  const handleAddCoInstructor = async (e) => {
    e.preventDefault();
    try {
      setSubmittingCo(true);
      setActionError(null);
      await sessionApi.addCoInstructor(id, Number(selectedInstructorId));
      setIsCoModalOpen(false);
      setPromotionNotice('Co-instructor successfully assigned to session.');
      fetchSession(false);
    } catch (err) {
      setActionError(err.message || 'Failed to assign co-instructor.');
    } finally {
      setSubmittingCo(false);
    }
  };

  const handleConfirmRemoveCo = async () => {
    if (!coToRemove) return;
    try {
      setRemovingCo(true);
      setActionError(null);
      await sessionApi.removeCoInstructor(id, coToRemove.id);
      setPromotionNotice(
        `Co-instructor "${coToRemove.name}" was successfully removed from this session.`
      );
      setCoToRemove(null);
      fetchSession(false);
    } catch (err) {
      setActionError(err.message || 'Failed to remove co-instructor.');
    } finally {
      setRemovingCo(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading session roster & attendance..." />;
  }

  if (error || !session) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '36px' }}>
        <p style={{ color: 'var(--danger)', marginBottom: '16px' }}>{error || 'Session not found'}</p>
        <Link to="/sessions" className="btn btn-secondary">
          <ArrowLeft size={16} />
          <span>Back to Sessions</span>
        </Link>
      </div>
    );
  }

  const bookings = session.bookings || [];
  const enrolledBookings = bookings.filter((b) => b.status !== 'WAITLISTED');
  const waitlistedBookings = bookings.filter((b) => b.status === 'WAITLISTED');
  const coInstructors = session.coInstructors || [];

  // Date and duration calculations
  const sessionStart = new Date(session.start_time || session.startTime);
  const dateStr = formatLocalDate(session.start_time || session.startTime);
  const timeStr = formatDisplayTime(session.start_time || session.startTime);
  const durationMin = session.duration || session.duration_minutes || session.class?.default_duration || 60;
  const now = new Date();
  const endTime = new Date(sessionStart.getTime() + durationMin * 60000);
  const sessionStatus = now < sessionStart ? 'SCHEDULED' : now <= endTime ? 'IN_PROGRESS' : 'COMPLETED';
  const isPast = now >= sessionStart;

  // Authorization check
  const isPrimary = session.primary_instructor_id === user?.id || session.primaryInstructor?.id === user?.id;
  const isCo = coInstructors.some((c) => c.instructorId === user?.id || c.id === user?.id);
  const canSettle = (isStaff || isPrimary || isCo) && isPast;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
              <h1 className="page-title">
                {session.class?.title || `Class #${session.classId || session.class_id}`}
              </h1>
              <StatusBadge status={sessionStatus} />
            </div>
            <p className="page-subtitle">
              Session Roster & Attendance Check-in Sheet
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleExportCsv}
              className="btn btn-secondary"
              disabled={exporting}
            >
              <Download size={16} />
              <span>{exporting ? 'Exporting...' : 'Export Attendance CSV'}</span>
            </button>

            {isStaff && (
              <button
                onClick={() => setIsCoModalOpen(true)}
                className="btn btn-primary"
              >
                <UserPlus size={16} />
                <span>Add Co-Instructor</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {promotionNotice && (
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
            <span>{promotionNotice}</span>
          </div>
          <button
            onClick={() => setPromotionNotice(null)}
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

      {actionError && !settleModal && !bookingToCancel && !isCoModalOpen && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'var(--danger-light)',
            border: '1px solid var(--danger)',
            borderRadius: 'var(--radius-md)',
            color: '#FCA5A5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#FCA5A5',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Session Metadata Grid */}
      <div className="grid-cols-4">
        <div className="card">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Date & Time</span>
          <div style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '4px' }}>
            {dateStr} at {timeStr}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {durationMin} minutes
          </span>
        </div>

        <div className="card">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Location</span>
          <div style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '4px' }}>
            {session.room || 'Studio A'}
          </div>
        </div>

        <div className="card">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Primary Instructor</span>
          <div style={{ fontSize: '1.05rem', fontWeight: '700', color: '#818CF8', marginTop: '4px' }}>
            {session.primaryInstructor?.name || session.primary_instructor_id || 'Assigned'}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {session.primaryInstructor?.email}
          </span>
        </div>

        <div className="card">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Capacity & Enrollment</span>
          <div style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '4px' }}>
            {enrolledBookings.length} / {session.capacity}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Waitlist Queue: {waitlistedBookings.length}
          </span>
        </div>
      </div>

      {/* Co-Instructors Section */}
      {coInstructors.length > 0 && (
        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Users size={20} style={{ color: 'var(--success)' }} />
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                Assigned Co-Instructors
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                {coInstructors.map((co) => {
                  const coName = co.name || co.user?.name || `Instructor #${co.instructorId || co.id}`;
                  const coId = co.instructorId || co.id;

                  return (
                    <span
                      key={co.id || co.instructorId}
                      style={{
                        fontSize: '0.8rem',
                        backgroundColor: 'var(--bg-elevated)',
                        padding: '3px 10px',
                        borderRadius: 'var(--radius-full)',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <span>{coName}</span>
                      {isStaff && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setActionError(null);
                            setCoToRemove({ id: coId, name: coName });
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--danger)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '2px',
                            borderRadius: '4px',
                          }}
                          title={`Remove ${coName}`}
                          aria-label={`Remove ${coName}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enrolled Roster */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-primary)' }}>
            Enrolled Attendees ({enrolledBookings.length})
          </h2>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Attendance settlement is permitted for sessions starting now or in the past
          </span>
        </div>

        {enrolledBookings.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No attendees enrolled"
            description="No bookings have been registered for this session yet."
          />
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Member Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Booked Date</th>
                  <th style={{ textAlign: 'right' }}>Attendance Settlement</th>
                </tr>
              </thead>
              <tbody>
                {enrolledBookings.map((b) => {
                  const member = b.member || {};
                  const isBooked = b.status === 'BOOKED';
                  const bookingDate = b.bookingDate || (b.createdAt || b.created_at ? new Date(b.createdAt || b.created_at).toLocaleDateString() : '—');

                  return (
                    <tr key={b.id}>
                      <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                        {member.name || `Member #${b.memberId || b.member_id}`}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {member.email || '—'}
                      </td>
                      <td>
                        <StatusBadge status={b.status} />
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        {bookingDate}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                          {isBooked && canSettle && (
                            <>
                              <button
                                onClick={() => openSettleModal(b, 'ATTENDED')}
                                className="btn btn-secondary btn-sm"
                                style={{ color: 'var(--success)' }}
                                title="Mark Attended (with optional note)"
                              >
                                <CheckCircle size={15} />
                                <span>Attended</span>
                              </button>
                              <button
                                onClick={() => openSettleModal(b, 'NO_SHOW')}
                                className="btn btn-secondary btn-sm"
                                style={{ color: 'var(--danger)' }}
                                title="Mark No-Show (with optional note)"
                              >
                                <XCircle size={15} />
                                <span>No-Show</span>
                              </button>
                            </>
                          )}
                          {isBooked && !isPast && (
                            <>
                              <span
                                style={{
                                  fontSize: '0.78rem',
                                  color: 'var(--text-muted)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                                  padding: '4px 8px',
                                  borderRadius: 'var(--radius-sm)',
                                  border: '1px solid var(--border)',
                                }}
                              >
                                <Clock size={13} style={{ opacity: 0.7 }} />
                                <span>Not started yet</span>
                              </span>
                              {isStaff && (
                                <button
                                  onClick={() => setBookingToCancel(b)}
                                  className="btn btn-secondary btn-sm"
                                  style={{ color: 'var(--danger)' }}
                                  title="Cancel booking (triggers auto waitlist promotion if members are queued)"
                                >
                                  <Ban size={15} />
                                  <span>Cancel</span>
                                </button>
                              )}
                            </>
                          )}
                          {!isBooked && (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {b.status === 'ATTENDED' ? 'Settled: Attended' : b.status === 'NO_SHOW' ? 'Settled: No-Show' : b.status}
                            </span>
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
      </div>

      {/* Waitlist Roster */}
      {waitlistedBookings.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '14px' }}>
            Waitlist Queue ({waitlistedBookings.length})
          </h2>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Queue Pos</th>
                  <th>Member Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Waitlisted At</th>
                </tr>
              </thead>
              <tbody>
                {waitlistedBookings.map((b, idx) => (
                  <tr key={b.id}>
                    <td>
                      <span
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--warning-light)',
                          color: '#FBBF24',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '700',
                          fontSize: '0.78rem',
                        }}
                      >
                        {b.waitlistPosition || b.waitlist_position || idx + 1}
                      </span>
                    </td>
                    <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                      {b.member?.name || `Member #${b.memberId || b.member_id}`}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {b.member?.email}
                    </td>
                    <td>
                      <StatusBadge status="WAITLISTED" />
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      {b.createdAt || b.created_at ? new Date(b.createdAt || b.created_at).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Attendance Settlement with Inline Note Modal */}
      {settleModal && (
        <Modal
          isOpen={Boolean(settleModal)}
          onClose={() => setSettleModal(null)}
          title={`Settle Attendance: Mark as ${settleModal.status}`}
        >
          <form onSubmit={handleConfirmSettle} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                padding: '12px',
                backgroundColor: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Member</div>
              <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '1rem' }}>
                {settleModal.booking?.member?.name || `Member #${settleModal.booking?.memberId}`}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {settleModal.booking?.member?.email}
              </div>
            </div>

            {isStaff && (
              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>
                  Optional Verification Note (Inline)
                </label>
                <textarea
                  className="input-field"
                  rows="3"
                  placeholder="e.g. Arrived on time, late entry approved, medical waiver confirmed..."
                  value={settleNote}
                  onChange={(e) => setSettleNote(e.target.value)}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  This note will be saved directly into the booking's audit timeline entry.
                </span>
              </div>
            )}

            {actionError && (
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: 'var(--radius-sm)',
                  color: '#FCA5A5',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{actionError}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setSettleModal(null);
                  setActionError(null);
                }}
                disabled={submittingSettle}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`btn ${settleModal.status === 'ATTENDED' ? 'btn-primary' : 'btn-danger'}`}
                disabled={submittingSettle}
              >
                {submittingSettle ? 'Recording...' : `Confirm ${settleModal.status}`}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Co-Instructor Modal */}
      {isStaff && (
        <Modal
          isOpen={isCoModalOpen}
          onClose={() => setIsCoModalOpen(false)}
          title="Assign Co-Instructor"
        >
          <form onSubmit={handleAddCoInstructor} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>
                Select Instructor *
              </label>
              <select
                className="select-field"
                value={selectedInstructorId}
                onChange={(e) => setSelectedInstructorId(e.target.value)}
              >
                <option value="2">Priya Sharma (ID: 2)</option>
                <option value="3">Raj Patel (ID: 3)</option>
                <option value="4">Anita Desai (ID: 4)</option>
                <option value="5">Vikram Malhotra (ID: 5)</option>
              </select>
            </div>

            {actionError && (
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: 'var(--radius-sm)',
                  color: '#FCA5A5',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{actionError}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setIsCoModalOpen(false);
                  setActionError(null);
                }}
                disabled={submittingCo}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submittingCo}
              >
                {submittingCo ? 'Assigning...' : 'Assign Co-Instructor'}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {/* Cancel Booking Confirmation Modal */}
      {bookingToCancel && (
        <ConfirmDialog
          isOpen={true}
          title="Cancel Booking"
          message={`Are you sure you want to cancel the booking for ${bookingToCancel.member?.name || `Member #${bookingToCancel.memberId || bookingToCancel.member_id}`}? If there are waitlisted members, the earliest member in queue will be automatically promoted.`}
          confirmLabel={cancelling ? 'Cancelling...' : 'Cancel Booking'}
          confirmVariant="danger"
          loading={cancelling}
          error={actionError}
          onConfirm={handleConfirmCancel}
          onClose={() => {
            setBookingToCancel(null);
            setActionError(null);
          }}
        />
      )}

      {/* Remove Co-Instructor Confirmation Modal */}
      {coToRemove && (
        <ConfirmDialog
          isOpen={true}
          title="Remove Co-Instructor"
          message={`Are you sure you want to remove ${coToRemove.name} as a co-instructor from this session?`}
          confirmLabel={removingCo ? 'Removing...' : 'Remove Co-Instructor'}
          confirmVariant="danger"
          loading={removingCo}
          error={actionError}
          onConfirm={handleConfirmRemoveCo}
          onClose={() => {
            setCoToRemove(null);
            setActionError(null);
          }}
        />
      )}
    </div>
  );
}
