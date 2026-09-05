import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { bookingApi } from '../api/bookingApi';
import { sessionApi } from '../api/sessionApi';
import { classApi } from '../api/classApi';
import { instructorApi } from '../api/instructorApi';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import {
  BookmarkCheck,
  Search,
  Plus,
  Ban,
  Clock,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Send,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  RotateCcw,
} from 'lucide-react';
import { formatLocalDate, formatDisplayTime } from '../utils/date';

export function BookingsPage() {
  const { isStaff, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSessionId = searchParams.get('session_id') || '';
  const urlClassId = searchParams.get('class_id') || '';

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Server-side Filters, Sorting & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [classFilter, setClassFilter] = useState(urlClassId);
  const [sessionFilter, setSessionFilter] = useState(urlSessionId);
  const [sortBy, setSortBy] = useState('booked_at');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  const [availableClasses, setAvailableClasses] = useState([]);
  const [availableSessions, setAvailableSessions] = useState([]);

  // Cancel Booking State
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [promotionNotice, setPromotionNotice] = useState(null);

  // Timeline State (Staff Only)
  const [selectedBookingForTimeline, setSelectedBookingForTimeline] = useState(null);
  const [timelineData, setTimelineData] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);
  const [noteError, setNoteError] = useState(null);

  // Create Booking State (Staff Only)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    session_id: '',
    member_id: '',
  });
  const [createError, setCreateError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [activeSessions, setActiveSessions] = useState([]);

  // Sync URL search params
  useEffect(() => {
    const sId = searchParams.get('session_id') || '';
    const cId = searchParams.get('class_id') || '';
    if (sId !== sessionFilter) {
      setSessionFilter(sId);
      setPage(1);
    }
    if (cId !== classFilter) {
      setClassFilter(cId);
      setPage(1);
    }
  }, [searchParams]);

  // Debounce search term by 350ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await bookingApi.getBookings({
        page,
        limit: 10,
        search: debouncedSearch.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        class_id: classFilter || undefined,
        session_id: sessionFilter || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      });

      const bookingsData = Array.isArray(res) ? res : res?.data || res?.bookings || [];
      const paginationData = res?.pagination || {
        page,
        limit: 10,
        total: bookingsData.length,
        totalPages: Math.max(1, Math.ceil(bookingsData.length / 10)),
      };

      setBookings(bookingsData);
      setPagination(paginationData);
    } catch (err) {
      setError(err.message || 'Failed to fetch bookings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [page, debouncedSearch, statusFilter, classFilter, sessionFilter, sortBy, sortOrder]);

  useEffect(() => {
    // Load classes for filtering
    const loadClasses = isStaff
      ? classApi.getClasses(false)
      : instructorApi.getActiveClasses();

    loadClasses.then((res) => {
      if (Array.isArray(res)) setAvailableClasses(res);
    }).catch(() => {});

    // Load sessions for filtering
    sessionApi.getSessions().then((res) => {
      if (Array.isArray(res)) {
        setAvailableSessions(res);
        setActiveSessions(res);
      }
    }).catch(() => {});
  }, []);

  const handleConfirmCancel = async () => {
    if (!bookingToCancel) return;
    try {
      setCancelling(true);
      setPromotionNotice(null);
      const res = await bookingApi.cancelBooking(bookingToCancel.id);

      if (res?.promotedBooking) {
        setPromotionNotice(
          `Waitlist promotion triggered: Member #${res.promotedBooking.memberId} was automatically moved from WAITLIST to BOOKED status!`
        );
      } else {
        setPromotionNotice('Booking successfully cancelled.');
      }

      setBookingToCancel(null);
      fetchBookings();
    } catch (err) {
      alert(err.message || 'Failed to cancel booking.');
    } finally {
      setCancelling(false);
    }
  };

  const handleOpenTimeline = async (booking) => {
    setSelectedBookingForTimeline(booking);
    setNewNote('');
    setNoteError(null);
    try {
      setTimelineLoading(true);
      const data = await bookingApi.getTimeline(booking.id);
      setTimelineData(Array.isArray(data) ? data : []);
    } catch (err) {
      setNoteError(err.message || 'Failed to retrieve audit timeline.');
    } finally {
      setTimelineLoading(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim() || !selectedBookingForTimeline) return;
    try {
      setSubmittingNote(true);
      setNoteError(null);
      await bookingApi.addStaffNote(selectedBookingForTimeline.id, newNote.trim());
      setNewNote('');
      // Reload timeline
      const updated = await bookingApi.getTimeline(selectedBookingForTimeline.id);
      setTimelineData(Array.isArray(updated) ? updated : []);
    } catch (err) {
      setNoteError(err.message || 'Failed to add staff note.');
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleCreateBooking = async (e) => {
    e.preventDefault();
    if (!createForm.session_id || !createForm.member_id) {
      setCreateError('Session ID and Member ID are required.');
      return;
    }

    try {
      setCreating(true);
      setCreateError(null);
      await bookingApi.createBooking({
        session_id: Number(createForm.session_id),
        member_id: Number(createForm.member_id),
      });
      setIsCreateModalOpen(false);
      setCreateForm({ session_id: '', member_id: '' });
      fetchBookings();
    } catch (err) {
      setCreateError(err.message || 'Failed to register booking.');
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = (val) => {
    setStatusFilter(val);
    setPage(1);
  };

  const handleClassChange = (val) => {
    setClassFilter(val);
    setSessionFilter('');
    setPage(1);
  };

  const handleSessionChange = (val) => {
    setSessionFilter(val);
    setPage(1);
  };

  const handleSortChange = (val) => {
    const [by, ord] = val.split(':');
    setSortBy(by);
    setSortOrder(ord);
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    searchTerm ||
    statusFilter !== 'ALL' ||
    classFilter ||
    sessionFilter ||
    sortBy !== 'booked_at' ||
    sortOrder !== 'DESC'
  );

  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setStatusFilter('ALL');
    setClassFilter('');
    setSessionFilter('');
    setSortBy('booked_at');
    setSortOrder('DESC');
    setPage(1);
    setSearchParams({});
  };

  const sessionOptions = classFilter
    ? availableSessions.filter((s) => String(s.class_id || s.class?.id) === String(classFilter))
    : availableSessions;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {isStaff ? 'Bookings & Lifecycle' : 'Session Bookings'}
          </h1>
          <p className="page-subtitle">
            {isStaff
              ? 'Audit booking states, waitlists, status transitions, and manage reservations.'
              : 'Bookings for classes and sessions in which you are an instructor.'}
          </p>
        </div>

        {isStaff && (
          <button onClick={() => setIsCreateModalOpen(true)} className="btn btn-primary">
            <Plus size={16} />
            <span>New Booking</span>
          </button>
        )}
      </div>

      {promotionNotice && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#6EE7B7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={18} />
            <span>{promotionNotice}</span>
          </div>
          <button
            onClick={() => setPromotionNotice(null)}
            className="btn btn-secondary btn-sm"
            style={{ padding: '2px 8px' }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter toolbar */}
      <div className="filter-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: '200px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            className="input-field"
            placeholder="Search by member name or email..."
            style={{ paddingLeft: '36px' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Class Filter */}
        <select
          className="select-field"
          style={{ width: 'auto', minWidth: '150px' }}
          value={classFilter}
          onChange={(e) => handleClassChange(e.target.value)}
        >
          <option value="">All Classes</option>
          {availableClasses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>

        {/* Session Filter */}
        <select
          className="select-field"
          style={{ width: 'auto', minWidth: '160px' }}
          value={sessionFilter}
          onChange={(e) => handleSessionChange(e.target.value)}
        >
          <option value="">All Sessions</option>
          {sessionOptions.map((s) => {
            const timeStr = formatDisplayTime(s.start_time || s.startTime);
            const dateStr = formatLocalDate(s.start_time || s.startTime);
            return (
              <option key={s.id} value={s.id}>
                Session #{s.id} — {s.class?.title || 'Class'} ({dateStr} {timeStr})
              </option>
            );
          })}
        </select>

        {/* Status Filter */}
        <select
          className="select-field"
          style={{ width: 'auto', minWidth: '140px' }}
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value)}
        >
          <option value="ALL">All Statuses</option>
          <option value="BOOKED">BOOKED</option>
          <option value="WAITLISTED">WAITLISTED</option>
          <option value="ATTENDED">ATTENDED</option>
          <option value="NO_SHOW">NO_SHOW</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>

        {/* Sort Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ArrowUpDown size={15} style={{ color: 'var(--text-muted)' }} />
          <select
            className="select-field"
            style={{ width: 'auto', minWidth: '190px' }}
            value={`${sortBy}:${sortOrder}`}
            onChange={(e) => handleSortChange(e.target.value)}
          >
            <option value="booked_at:DESC">Booked: Newest First (DESC)</option>
            <option value="booked_at:ASC">Booked: Oldest First (ASC)</option>
            <option value="session:ASC">Session Time: Earliest First</option>
            <option value="session:DESC">Session Time: Latest First</option>
            <option value="status:ASC">Status: A–Z</option>
            <option value="status:DESC">Status: Z–A</option>
          </select>
        </div>

        {/* Reset Filters */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
        )}
      </div>

      {loading ? (
        <LoadingSpinner message="Fetching bookings..." />
      ) : error ? (
        <div className="card" style={{ textAlign: 'center', padding: '36px', color: 'var(--danger)' }}>
          {error}
        </div>
      ) : bookings.length === 0 ? (
        <EmptyState
          icon={BookmarkCheck}
          title="No bookings found"
          description="Try modifying your search query or filters."
        />
      ) : (
        <>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Member</th>
                  <th>Class & Session</th>
                  <th>Status</th>
                  <th>Waitlist Pos</th>
                  <th>Created At</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => {
                  const canCancel = isStaff && (b.status === 'BOOKED' || b.status === 'WAITLISTED');

                  const sessionStart = new Date(b.session?.start_time || b.session?.startTime);
                  const sessionDateStr = formatLocalDate(b.session?.start_time || b.session?.startTime);
                  const sessionTimeStr = formatDisplayTime(b.session?.start_time || b.session?.startTime);
                  const bookingCreated = b.created_at || b.createdAt;

                  return (
                    <tr key={b.id}>
                      <td style={{ fontWeight: '700', color: 'var(--text-muted)' }}>
                        #{b.id}
                      </td>
                      <td>
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                          {b.member?.name || `Member #${b.memberId || b.member_id}`}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {b.member?.email || '—'}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                          {b.session?.class?.title || `Session #${b.sessionId || b.session_id}`}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {sessionDateStr} at {sessionTimeStr} ({b.session?.room || 'Studio'})
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={b.status} />
                      </td>
                      <td>
                        {b.status === 'WAITLISTED' ? (
                          <span
                            style={{
                              fontWeight: '700',
                              color: '#FBBF24',
                              backgroundColor: 'var(--warning-light)',
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-full)',
                              fontSize: '0.8rem',
                            }}
                          >
                            #{b.waitlistPosition || b.waitlist_position || '—'}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {bookingCreated ? new Date(bookingCreated).toLocaleDateString() : '—'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          {isStaff && (
                            <button
                              onClick={() => handleOpenTimeline(b)}
                              className="btn btn-secondary btn-sm"
                              title="View Audit Timeline & Notes"
                            >
                              <Clock size={14} />
                              <span>Timeline</span>
                            </button>
                          )}

                          {canCancel && (
                            <button
                              onClick={() => setBookingToCancel(b)}
                              className="btn btn-secondary btn-sm"
                              title="Cancel Booking"
                              style={{ color: 'var(--danger)' }}
                            >
                              <Ban size={14} />
                              <span>Cancel</span>
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

          {/* Server-side Pagination Controls */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 18px',
              backgroundColor: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              marginTop: '4px',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Showing {pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1}–
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} bookings
            </span>

            {pagination.totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={pagination.page <= 1 || loading}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <ChevronLeft size={16} />
                  <span>Previous</span>
                </button>

                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    disabled={loading}
                    className={`btn btn-sm ${p === pagination.page ? 'btn-primary' : 'btn-secondary'}`}
                    style={{
                      minWidth: '32px',
                      padding: '4px 10px',
                      fontSize: '0.85rem',
                      fontWeight: p === pagination.page ? '700' : '400',
                    }}
                  >
                    {p}
                  </button>
                ))}

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setPage((prev) => Math.min(prev + 1, pagination.totalPages))}
                  disabled={pagination.page >= pagination.totalPages || loading}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <span>Next</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(bookingToCancel)}
        onClose={() => setBookingToCancel(null)}
        onConfirm={handleConfirmCancel}
        title="Cancel Booking Reservation"
        message={`Are you sure you want to cancel booking #${bookingToCancel?.id} for ${bookingToCancel?.member?.name || 'this member'}? If other members are on the waitlist, the first member in queue will be automatically promoted.`}
        confirmLabel={cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
        confirmVariant="danger"
      />

      {/* Timeline & Notes Modal */}
      {selectedBookingForTimeline && (
        <Modal
          isOpen={Boolean(selectedBookingForTimeline)}
          onClose={() => setSelectedBookingForTimeline(null)}
          title={`Audit Timeline: Booking #${selectedBookingForTimeline.id}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div
              style={{
                padding: '12px',
                backgroundColor: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Member</span>
                <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                  {selectedBookingForTimeline.member?.name || `Member #${selectedBookingForTimeline.memberId || selectedBookingForTimeline.member_id}`}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Current Status</span>
                <div>
                  <StatusBadge status={selectedBookingForTimeline.status} />
                </div>
              </div>
            </div>

            {/* Timeline Stream */}
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '12px', color: 'var(--text-secondary)' }}>
                Lifecycle History
              </h4>

              {timelineLoading ? (
                <LoadingSpinner message="Loading audit history..." />
              ) : timelineData.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No history events recorded.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '280px', overflowY: 'auto' }}>
                  {timelineData.map((item, idx) => {
                    const fromStatus = item.from_status ?? item.fromStatus;
                    const toStatus = item.to_status ?? item.toStatus;
                    const changeSource = item.change_source ?? item.changeSource ?? 'SYSTEM';
                    const createdAt = item.created_at ?? item.createdAt;
                    const actorName = item.actor?.name || (item.actor_id ? `Staff #${item.actor_id}` : null);

                    return (
                      <div
                        key={item.id || idx}
                        style={{
                          padding: '10px 12px',
                          backgroundColor: 'var(--bg-elevated)',
                          borderRadius: 'var(--radius-sm)',
                          borderLeft: `3px solid ${toStatus === 'BOOKED' ? 'var(--primary)' : toStatus === 'CANCELLED' ? 'var(--danger)' : toStatus === 'ATTENDED' ? 'var(--success)' : 'var(--border)'}`,
                          fontSize: '0.82rem',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                            {fromStatus ? `${fromStatus} → ` : 'Initial: '}{toStatus}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {createdAt ? new Date(createdAt).toLocaleString() : ''}
                          </span>
                        </div>
                        <div style={{ color: 'var(--text-secondary)', display: 'flex', gap: '10px', fontSize: '0.78rem' }}>
                          <span>Source: <strong>{changeSource}</strong></span>
                          {actorName && <span>Actor: <strong>{actorName}</strong></span>}
                        </div>
                        {item.note && (
                          <div style={{ marginTop: '6px', fontStyle: 'italic', color: 'var(--text-primary)', backgroundColor: 'rgba(255,255,255,0.04)', padding: '4px 8px', borderRadius: '4px' }}>
                            "{item.note}"
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Staff Add Note Form */}
            <form onSubmit={handleAddNote} style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Add Staff Audit Note
              </label>
              {noteError && (
                <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginBottom: '6px' }}>
                  {noteError}
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Record verification or member note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  disabled={submittingNote}
                />
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={submittingNote || !newNote.trim()}
                >
                  <Send size={15} />
                  <span>{submittingNote ? 'Adding...' : 'Post'}</span>
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* New Booking Modal (Staff Only) */}
      {isStaff && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Create New Reservation"
        >
          <form onSubmit={handleCreateBooking} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {createError && (
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
                <span>{createError}</span>
              </div>
            )}

            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>
                Session *
              </label>
              <select
                className="select-field"
                value={createForm.session_id}
                onChange={(e) => setCreateForm({ ...createForm, session_id: e.target.value })}
                required
              >
                <option value="">Select a session...</option>
                {activeSessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    #{s.id} - {s.class?.title || 'Class'} ({s.date} {s.startTime})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>
                Member ID *
              </label>
              <input
                type="number"
                className="input-field"
                min="1"
                placeholder="e.g. 1, 2, 3..."
                value={createForm.member_id}
                onChange={(e) => setCreateForm({ ...createForm, member_id: e.target.value })}
                required
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Enter the target member's ID from studio registry.
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={creating}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={creating}
              >
                {creating ? 'Booking...' : 'Confirm Reservation'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
