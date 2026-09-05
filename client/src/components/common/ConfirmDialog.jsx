import React from 'react';
import { Modal } from './Modal';
import { AlertTriangle } from 'lucide-react';

export function ConfirmDialog({
  isOpen,
  onClose,
  onCancel,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText,
  confirmLabel,
  cancelText,
  cancelLabel,
  isDanger = false,
  confirmVariant,
  loading = false,
  error = null,
}) {
  const handleClose = onClose || onCancel;
  const isDestructive = isDanger || confirmVariant === 'danger';
  const confirmBtnText = confirmText || confirmLabel || 'Confirm';
  const cancelBtnText = cancelText || cancelLabel || 'Cancel';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} maxWidth="480px">
      <div className="modal-body">
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              backgroundColor: isDestructive ? 'var(--danger-light)' : 'var(--warning-light)',
              color: isDestructive ? '#F87171' : '#FBBF24',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <AlertTriangle size={22} />
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: '1.5' }}>
              {message}
            </p>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: 'var(--radius-sm)',
              color: '#FCA5A5',
              fontSize: '0.85rem',
              marginTop: '16px',
            }}
          >
            {error}
          </div>
        )}
      </div>

      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={handleClose} disabled={loading}>
          {cancelBtnText}
        </button>
        <button
          className={`btn ${isDestructive ? 'btn-danger' : 'btn-primary'}`}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? 'Processing...' : confirmBtnText}
        </button>
      </div>
    </Modal>
  );
}
