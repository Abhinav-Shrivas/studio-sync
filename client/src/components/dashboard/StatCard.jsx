import React from 'react';

export function StatCard({ title, value, subtitle, icon: Icon, color = 'indigo' }) {
  const colorMap = {
    indigo: {
      border: 'rgba(99, 102, 241, 0.25)',
      iconBg: 'rgba(99, 102, 241, 0.15)',
      iconColor: '#818CF8',
    },
    emerald: {
      border: 'rgba(16, 185, 129, 0.25)',
      iconBg: 'rgba(16, 185, 129, 0.15)',
      iconColor: '#34D399',
    },
    rose: {
      border: 'rgba(244, 63, 94, 0.25)',
      iconBg: 'rgba(244, 63, 94, 0.15)',
      iconColor: '#FB7185',
    },
    amber: {
      border: 'rgba(245, 158, 11, 0.25)',
      iconBg: 'rgba(245, 158, 11, 0.15)',
      iconColor: '#FBBF24',
    },
  };

  const scheme = colorMap[color] || colorMap.indigo;

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        borderLeft: `4px solid ${scheme.iconColor}`,
        transition: 'var(--transition)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>
          {title}
        </span>
        {Icon && (
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: scheme.iconBg,
              color: scheme.iconColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon size={20} />
          </div>
        )}
      </div>

      <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-primary)', lineHeight: '1' }}>
        {value ?? 0}
      </div>

      {subtitle && (
        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}
