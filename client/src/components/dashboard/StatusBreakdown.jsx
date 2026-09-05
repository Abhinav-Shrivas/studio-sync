import React from 'react';
import { StatusBadge } from '../common/StatusBadge';

export function StatusBreakdown({ data = [] }) {
  const total = data.reduce((acc, curr) => acc + Number(curr.count || 0), 0);

  const statusColors = {
    BOOKED: 'var(--primary)',
    WAITLISTED: 'var(--warning)',
    ATTENDED: 'var(--success)',
    CANCELLED: 'var(--text-muted)',
    NO_SHOW: 'var(--danger)',
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)' }}>
            Bookings by Status
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Total {total} bookings registered
          </p>
        </div>
      </div>

      {data.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No booking records found.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {data.map((item) => {
            const count = Number(item.count || 0);
            const percent = total > 0 ? Math.round((count / total) * 100) : 0;
            const barColor = statusColors[item.status] || 'var(--primary)';

            return (
              <div key={item.status} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <StatusBadge status={item.status} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                      {count}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      ({percent}%)
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    height: '6px',
                    width: '100%',
                    backgroundColor: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-full)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${percent}%`,
                      backgroundColor: barColor,
                      borderRadius: 'var(--radius-full)',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
