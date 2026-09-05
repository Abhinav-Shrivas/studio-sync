import React, { useState, useEffect } from 'react';
import { memberApi } from '../api/memberApi';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import {
  BellRing,
  AlertOctagon,
  Clock,
  CheckCircle2,
  Calendar,
  X,
  RefreshCw,
  Edit,
  AlertCircle,
} from 'lucide-react';

export function MembershipAlertsPage() {
  const [alerts, setAlerts] = useState({ count: 0, membershipExpired: [], membershipExpires: [] });
  const [activeTab, setActiveTab] = useState('expired'); // 'expired' | 'expires'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dismiss confirm
  const [memberToDismiss, setMemberToDismiss] = useState(null);
  const [dismissing, setDismissing] = useState(false);

  // Renew / Extend Expiry Modal
  const [renewMember, setRenewMember] = useState(null);
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [updatingExpiry, setUpdatingExpiry] = useState(false);
  const [renewError, setRenewError] = useState(null);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await memberApi.getAlerts();
      setAlerts(data || { count: 0, membershipExpired: [], membershipExpires: [] });
    } catch (err) {
      setError(err.message || 'Failed to fetch membership alerts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleConfirmDismiss = async () => {
    if (!memberToDismiss) return;
    try {
      setDismissing(true);
      await memberApi.dismissAlert(memberToDismiss.id);
      setMemberToDismiss(null);
      fetchAlerts();
    } catch (err) {
      alert(err.message || 'Failed to dismiss membership alert.');
    } finally {
      setDismissing(false);
    }
  };

  const handleOpenRenewModal = (member) => {
    setRenewMember(member);
    // Suggest 30 days from today
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setNewExpiryDate(d.toISOString().slice(0, 10));
    setRenewError(null);
  };

  const handleSaveExpiry = async (e) => {
    e.preventDefault();
    if (!newExpiryDate || !renewMember) return;
    try {
      setUpdatingExpiry(true);
      setRenewError(null);
      await memberApi.updateMemberExpiry(renewMember.id, newExpiryDate);
      setRenewMember(null);
      fetchAlerts();
    } catch (err) {
      setRenewError(err.message || 'Failed to update membership expiry date.');
    } finally {
      setUpdatingExpiry(false);
    }
  };

  const expiredList = alerts.membershipExpired || [];
  const expiresList = alerts.membershipExpires || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Membership Expiry Alerts</h1>
          <p className="page-subtitle">
            Monitor members with expired memberships or renewal deadlines approaching within 7 days.
          </p>
        </div>

        <button onClick={fetchAlerts} className="btn btn-secondary btn-sm" disabled={loading}>
          <RefreshCw size={16} className={loading ? 'spinning' : ''} />
          <span>Refresh Alerts</span>
        </button>
      </div>

      {error && (
        <div className="card" style={{ textAlign: 'center', padding: '36px', color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: '8px' }}>
        <button
          onClick={() => setActiveTab('expired')}
          style={{
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'expired' ? '2px solid var(--danger)' : '2px solid transparent',
            color: activeTab === 'expired' ? '#FCA5A5' : 'var(--text-secondary)',
            fontWeight: activeTab === 'expired' ? '700' : '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.92rem',
          }}
        >
          <AlertOctagon size={16} />
          <span>Expired Memberships</span>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--danger-light)',
              color: '#F87171',
              fontSize: '0.75rem',
              fontWeight: '700',
            }}
          >
            {expiredList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('expires')}
          style={{
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'expires' ? '2px solid var(--warning)' : '2px solid transparent',
            color: activeTab === 'expires' ? '#FDE68A' : 'var(--text-secondary)',
            fontWeight: activeTab === 'expires' ? '700' : '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.92rem',
          }}
        >
          <Clock size={16} />
          <span>Expiring in Next 7 Days</span>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--warning-light)',
              color: '#FBBF24',
              fontSize: '0.75rem',
              fontWeight: '700',
            }}
          >
            {expiresList.length}
          </span>
        </button>
      </div>

      {loading ? (
        <LoadingSpinner message="Checking membership statuses..." />
      ) : activeTab === 'expired' ? (
        expiredList.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="No expired memberships"
            description="All active members are in good standing with valid membership dates."
          />
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Contact Email</th>
                  <th>Expired On</th>
                  <th>Overdue Duration</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expiredList.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                        {m.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Member ID #{m.id}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{m.email}</td>
                    <td style={{ color: '#F87171', fontWeight: '600' }}>
                      {m.membershipExpiryDate}
                    </td>
                    <td>
                      <span
                        style={{
                          backgroundColor: 'var(--danger-light)',
                          color: '#F87171',
                          padding: '3px 10px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                        }}
                      >
                        {m.daysAgo} {m.daysAgo === 1 ? 'day' : 'days'} ago
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          onClick={() => handleOpenRenewModal(m)}
                          className="btn btn-primary btn-sm"
                          title="Renew Membership"
                        >
                          <Calendar size={14} />
                          <span>Renew</span>
                        </button>
                        <button
                          onClick={() => setMemberToDismiss(m)}
                          className="btn btn-secondary btn-sm"
                          title="Dismiss Alert"
                        >
                          <X size={14} />
                          <span>Dismiss</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : expiresList.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="No upcoming expirations"
          description="No memberships are due to expire in the next 7 days."
        />
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Contact Email</th>
                <th>Expires On</th>
                <th>Days Remaining</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {expiresList.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                      {m.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Member ID #{m.id}
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{m.email}</td>
                  <td style={{ color: '#FBBF24', fontWeight: '600' }}>
                    {m.membershipExpiryDate}
                  </td>
                  <td>
                    <span
                      style={{
                        backgroundColor: 'var(--warning-light)',
                        color: '#FBBF24',
                        padding: '3px 10px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.78rem',
                        fontWeight: '700',
                      }}
                    >
                      {m.daysRemaining} {m.daysRemaining === 1 ? 'day' : 'days'} remaining
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '8px' }}>
                      <button
                        onClick={() => handleOpenRenewModal(m)}
                        className="btn btn-primary btn-sm"
                        title="Extend Membership"
                      >
                        <Calendar size={14} />
                        <span>Extend</span>
                      </button>
                      <button
                        onClick={() => setMemberToDismiss(m)}
                        className="btn btn-secondary btn-sm"
                        title="Dismiss Alert"
                      >
                        <X size={14} />
                        <span>Dismiss</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dismiss Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(memberToDismiss)}
        onClose={() => setMemberToDismiss(null)}
        onConfirm={handleConfirmDismiss}
        title="Dismiss Membership Alert"
        message={`Are you sure you want to dismiss the expiry alert for ${memberToDismiss?.name}? This member will no longer trigger an alert for this expiry period.`}
        confirmLabel={dismissing ? 'Dismissing...' : 'Dismiss Alert'}
        confirmVariant="secondary"
      />

      {/* Renew / Extend Expiry Modal */}
      {renewMember && (
        <Modal
          isOpen={Boolean(renewMember)}
          onClose={() => setRenewMember(null)}
          title={`Update Membership: ${renewMember.name}`}
        >
          <form onSubmit={handleSaveExpiry} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {renewError && (
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
                <span>{renewError}</span>
              </div>
            )}

            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>
                New Membership Expiry Date *
              </label>
              <input
                type="date"
                className="input-field"
                value={newExpiryDate}
                onChange={(e) => setNewExpiryDate(e.target.value)}
                required
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Selecting a future date will automatically resolve this alert and restore booking eligibility.
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setRenewMember(null)}
                disabled={updatingExpiry}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={updatingExpiry}
              >
                {updatingExpiry ? 'Saving...' : 'Update Expiry Date'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
