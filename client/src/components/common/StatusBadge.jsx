import React from 'react';

export function StatusBadge({ status }) {
  if (!status) return null;

  const normalized = String(status).toUpperCase();

  let badgeClass = 'badge';
  let label = normalized;

  switch (normalized) {
    case 'BOOKED':
      badgeClass += ' badge-booked';
      label = 'Booked';
      break;
    case 'WAITLISTED':
      badgeClass += ' badge-waitlisted';
      label = 'Waitlisted';
      break;
    case 'ATTENDED':
      badgeClass += ' badge-attended';
      label = 'Attended';
      break;
    case 'NO_SHOW':
      badgeClass += ' badge-noshow';
      label = 'No Show';
      break;
    case 'CANCELLED':
      badgeClass += ' badge-cancelled';
      label = 'Cancelled';
      break;
    case 'ARCHIVED':
      badgeClass += ' badge-archived';
      label = 'Archived';
      break;
    case 'ACTIVE':
      badgeClass += ' badge-active';
      label = 'Active';
      break;
    default:
      badgeClass += ' badge-secondary';
      break;
  }

  return <span className={badgeClass}>{label}</span>;
}
