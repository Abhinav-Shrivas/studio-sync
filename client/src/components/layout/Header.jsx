import React from 'react';
import { useLocation, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { User, Bell, Sparkles, BookmarkCheck } from 'lucide-react';

const routeTitles = {
  '/dashboard': 'Studio Dashboard',
  '/classes': 'Class Catalog',
  '/instructor/classes': 'Active Class Discovery',
  '/sessions': 'Session Schedule',
  '/sessions/recurring': 'Generate Recurring Schedule',
  '/bookings': 'Bookings Management',
  '/members': 'Membership Expiry & Alerts',
};

export function Header() {
  const { user, role, isStaff } = useAuth();
  const location = useLocation();

  const getPageTitle = () => {
    if (routeTitles[location.pathname]) {
      return routeTitles[location.pathname];
    }
    if (location.pathname.startsWith('/classes/')) {
      return 'Class Details & Sessions';
    }
    if (location.pathname.startsWith('/instructor/classes/')) {
      return 'My Class Sessions';
    }
    if (location.pathname.startsWith('/sessions/')) {
      return 'Session Roster & Attendance';
    }
    return 'StudioSync';
  };

  return (
    <header className="top-header">
      <div className="header-breadcrumbs">
        <Sparkles size={18} style={{ color: 'var(--primary-hover)' }} />
        <span>{getPageTitle()}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {isStaff && (
          <NavLink
            to="/bookings?session_id=12"
            className="btn btn-secondary btn-sm"
            style={{
              fontSize: '0.78rem',
              padding: '4px 10px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              color: '#A5B4FC',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
              fontWeight: '500',
            }}
            title="Demo shortcut: Cancel a booking in Session #12 to test auto waitlist promotion"
          >
            <BookmarkCheck size={14} />
            <span>Test Waitlist Promotion</span>
          </NavLink>
        )}


        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: isStaff ? 'var(--primary-light)' : 'var(--success-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isStaff ? '#818CF8' : '#34D399',
              fontWeight: '700',
              fontSize: '0.85rem',
            }}
          >
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div style={{ lineHeight: '1.2' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>
              {user?.name}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {role}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
