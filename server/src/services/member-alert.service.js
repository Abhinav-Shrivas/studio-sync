'use strict';

const memberRepository = require('../repositories/member.repository');
const memberAlertRepository = require('../repositories/member-alert.repository');
const { ValidationError, NotFoundError, ConflictError } = require('../utils/errors');

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Returns UTC calendar date string in YYYY-MM-DD format.
 */
function getTodayDateString(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

/**
 * Adds integer days to a YYYY-MM-DD date string, returning YYYY-MM-DD.
 */
function addDaysToDateString(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Calculates absolute day difference between two YYYY-MM-DD date strings.
 */
function diffDays(fromDateStr, toDateStr) {
  const from = new Date(`${fromDateStr}T00:00:00.000Z`);
  const to = new Date(`${toDateStr}T00:00:00.000Z`);
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

/**
 * Retrieves active membership alerts categorized into membershipExpired and membershipExpires.
 */
async function getAlerts() {
  const todayStr = getTodayDateString();
  const maxExpiryDate = addDaysToDateString(todayStr, 7);

  const eligibleMembers = await memberAlertRepository.findActiveEligibleMembers(maxExpiryDate);

  const membershipExpired = [];
  const membershipExpires = [];

  for (const member of eligibleMembers) {
    const expiryStr = typeof member.membership_expiry === 'string'
      ? member.membership_expiry
      : getTodayDateString(new Date(member.membership_expiry));

    if (expiryStr < todayStr) {
      const daysAgo = diffDays(expiryStr, todayStr);
      membershipExpired.push({
        id: member.id,
        name: member.name,
        email: member.email,
        membershipExpiryDate: expiryStr,
        daysAgo,
      });
    } else {
      const daysRemaining = Math.max(0, diffDays(todayStr, expiryStr));
      membershipExpires.push({
        id: member.id,
        name: member.name,
        email: member.email,
        membershipExpiryDate: expiryStr,
        daysRemaining,
      });
    }
  }

  const count = membershipExpired.length + membershipExpires.length;

  return {
    count,
    membershipExpired,
    membershipExpires,
  };
}

/**
 * Dismisses an active membership alert for an eligible member.
 */
async function dismissAlert(memberId, user) {
  const parsedId = Number(memberId);
  if (!parsedId || isNaN(parsedId)) {
    throw new ValidationError('Invalid member ID');
  }

  const member = await memberRepository.findById(parsedId);
  if (!member) {
    throw new NotFoundError('Member not found');
  }

  const todayStr = getTodayDateString();
  const maxExpiryDate = addDaysToDateString(todayStr, 7);

  const expiryStr = typeof member.membership_expiry === 'string'
    ? member.membership_expiry
    : getTodayDateString(new Date(member.membership_expiry));

  if (expiryStr > maxExpiryDate) {
    throw new ValidationError('Member does not currently have an eligible membership alert');
  }

  const existingDismissal = await memberAlertRepository.findDismissalByMemberId(parsedId);
  if (existingDismissal) {
    throw new ConflictError('Membership alert has already been dismissed for this member');
  }

  const dismissal = await memberAlertRepository.createDismissal({
    member_id: parsedId,
    dismissed_by: user.id,
    dismissed_at: new Date(),
  });

  return {
    id: dismissal.id,
    member_id: dismissal.member_id,
    dismissed_by: dismissal.dismissed_by,
    dismissed_at: dismissal.dismissed_at,
  };
}

module.exports = {
  getAlerts,
  dismissAlert,
  getTodayDateString,
  addDaysToDateString,
  diffDays,
};
