import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { memberApi } from '../../api/memberApi';
import {
  LayoutDashboard,
  Layers,
  Calendar,
  BookmarkCheck,
  BellRing,
  LogOut,
  Compass,
  Users,
} from 'lucide-react';

export function Sidebar() {
  const { user, role, isStaff, logout } = useAuth();
  const navigate = useNavigate();
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    if (isStaff) {
      memberApi
        .getAlerts()
        .then((data) => {
          if (data && typeof data.count === 'number') {
            setAlertCount(data.count);
          }
        })
        .catch(() => {
          // ignore background count fetch failure
        });
    }
  }, [isStaff]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="studio-logo">S</div>
        <div>
          <div className="studio-title">StudioSync</div>
          <div className="studio-subtitle">Class Booking</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <LayoutDashboard size={18} />
          <span className="nav-text">Dashboard</span>
        </NavLink>

        {isStaff ? (
          <>
            <NavLink
              to="/classes"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Layers size={18} />
              <span className="nav-text">Classes</span>
            </NavLink>

            <NavLink
              to="/sessions"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Calendar size={18} />
              <span className="nav-text">Sessions</span>
            </NavLink>

            <NavLink
              to="/bookings"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <BookmarkCheck size={18} />
              <span className="nav-text">Bookings</span>
            </NavLink>

            <NavLink
              to="/members"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Users size={18} />
              <span className="nav-text">Members</span>
            </NavLink>

            <NavLink
              to="/membership-alerts"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <BellRing size={18} />
              <span className="nav-text">Membership Alerts</span>
              {alertCount > 0 && <span className="nav-badge">{alertCount}</span>}
            </NavLink>
          </>
        ) : (
          <>
            <NavLink
              to="/instructor/classes"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Compass size={18} />
              <span className="nav-text">Active Classes</span>
            </NavLink>

            <NavLink
              to="/sessions"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Calendar size={18} />
              <span className="nav-text">My Sessions</span>
            </NavLink>

            <NavLink
              to="/bookings"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <BookmarkCheck size={18} />
              <span className="nav-text">Bookings</span>
            </NavLink>
          </>
        )}
      </nav>

      {/* Quick demo shortcut for reviewer */}
      <div className="sidebar-demo">
        <div className="demo-label">Quick Demo</div>
        <NavLink
          to="/sessions/5"
          className="btn btn-secondary btn-sm demo-btn"
          title="Navigate to a past session with 10 unsettled bookings to test the attendance settlement workflow"
        >
          <Calendar size={14} />
          <span className="nav-text">Test Attendance Settlement</span>
        </NavLink>
        {isStaff && (
          <NavLink
            to="/bookings?session_id=12"
            className="btn btn-secondary btn-sm demo-btn"
            style={{ marginTop: '6px' }}
            title="Navigate to Session #12 (Express HIIT) with waitlisted candidates to test auto-promotion when a booking is cancelled"
          >
            <BookmarkCheck size={14} />
            <span className="nav-text">Test Waitlist Promotion</span>
          </NavLink>
        )}
      </div>

      <div className="sidebar-footer">
        <div className="user-snippet">
          <div className="user-avatar">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="user-info">
            <span className="user-name">{user?.name || 'User'}</span>
            <span className={`user-role-badge ${isStaff ? 'role-staff' : 'role-instructor'}`}>
              {role}
            </span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="btn btn-secondary btn-sm"
          style={{ width: '100%', justifyContent: 'flex-start' }}
        >
          <LogOut size={16} />
          <span className="nav-text">Sign out</span>
        </button>
      </div>
    </aside>
  );
}
