'use strict';

const { sequelize } = require('../models');
const memberRepository = require('../repositories/member.repository');
const memberAlertRepository = require('../repositories/member-alert.repository');
const { ValidationError, NotFoundError } = require('../utils/errors');

/**
 * Updates a member.
 * If membership_expiry changes to a different date, any existing alert dismissal
 * is deleted atomically inside the same database transaction.
 */
async function updateMember(id, updateData, user) {
  const parsedId = Number(id);
  if (!parsedId || isNaN(parsedId)) {
    throw new ValidationError('Invalid member ID');
  }

  const member = await memberRepository.findById(parsedId);
  if (!member) {
    throw new NotFoundError('Member not found');
  }

  const payload = { ...updateData };

  let isExpiryChanged = false;

  if ('membership_expiry' in payload) {
    const rawExpiry = payload.membership_expiry;
    if (!rawExpiry || typeof rawExpiry !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(rawExpiry.trim())) {
      throw new ValidationError('Invalid membership expiry date. Expected YYYY-MM-DD format.');
    }

    const parsedDate = new Date(`${rawExpiry.trim()}T00:00:00.000Z`);
    if (isNaN(parsedDate.getTime())) {
      throw new ValidationError('Invalid membership expiry date.');
    }

    const formattedExpiry = rawExpiry.trim();
    payload.membership_expiry = formattedExpiry;

    const currentExpiry = typeof member.membership_expiry === 'string'
      ? member.membership_expiry
      : new Date(member.membership_expiry).toISOString().slice(0, 10);

    if (formattedExpiry !== currentExpiry) {
      isExpiryChanged = true;
    }
  }

  if (isExpiryChanged) {
    return sequelize.transaction(async (t) => {
      await member.update(payload, { transaction: t });
      await memberAlertRepository.deleteDismissalByMemberId(parsedId, { transaction: t });
      return member;
    });
  }

  return member.update(payload);
}

module.exports = {
  updateMember,
};
