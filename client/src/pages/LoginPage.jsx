import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Shield, User, LogIn, AlertCircle, Mail, Lock } from 'lucide-react';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail, demoPass = 'password123') => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'radial-gradient(ellipse at top, #1E1B4B 0%, #090D16 70%)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)',
          padding: '36px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--primary), var(--purple))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: 'var(--shadow-glow)',
              color: '#FFFFFF',
              fontWeight: '800',
              fontSize: '1.4rem',
            }}
          >
            S
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '6px' }}>
            StudioSync
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            Class Booking & Studio Management System
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: 'var(--danger-light)',
              border: '1px solid var(--danger)',
              borderRadius: 'var(--radius-sm)',
              color: '#FCA5A5',
              fontSize: '0.85rem',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label className="form-label">
              <span>Email Address</span>
            </label>
            <div className="input-icon-wrapper">
              <span className="input-icon">
                <Mail size={17} />
              </span>
              <input
                type="email"
                className="input-field"
                placeholder="e.g. staff@studio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="form-label">
              <span>Password</span>
            </label>
            <div className="input-icon-wrapper">
              <span className="input-icon">
                <Lock size={17} />
              </span>
              <input
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '6px', padding: '12px', fontSize: '0.95rem', fontWeight: '600' }}
            disabled={loading}
          >
            <LogIn size={18} />
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
          </button>
        </form>

        <div
          style={{
            margin: '28px 0 20px',
            position: 'relative',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              height: '1px',
              backgroundColor: 'var(--border)',
              position: 'absolute',
              top: '50%',
              left: 0,
              right: 0,
            }}
          />
          <span
            style={{
              position: 'relative',
              backgroundColor: 'var(--bg-card)',
              padding: '0 12px',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Quick Demo Accounts
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => fillDemo('staff@studio.com', 'password123')}
            style={{ justifyContent: 'flex-start', padding: '10px 12px' }}
          >
            <Shield size={16} style={{ color: 'var(--primary-hover)' }} />
            <div style={{ textAlign: 'left', flex: 1 }}>
              <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>Staff Admin</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>staff@studio.com</div>
            </div>
            <span className="user-role-badge role-staff">STAFF</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => fillDemo('priya@studio.com', 'password123')}
            style={{ justifyContent: 'flex-start', padding: '10px 12px' }}
          >
            <User size={16} style={{ color: 'var(--success)' }} />
            <div style={{ textAlign: 'left', flex: 1 }}>
              <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>Priya Sharma</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>priya@studio.com</div>
            </div>
            <span className="user-role-badge role-instructor">INSTRUCTOR</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => fillDemo('raj@studio.com', 'password123')}
            style={{ justifyContent: 'flex-start', padding: '10px 12px' }}
          >
            <User size={16} style={{ color: 'var(--success)' }} />
            <div style={{ textAlign: 'left', flex: 1 }}>
              <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>Raj Patel</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>raj@studio.com</div>
            </div>
            <span className="user-role-badge role-instructor">INSTRUCTOR</span>
          </button>
        </div>
      </div>
    </div>
  );
}
