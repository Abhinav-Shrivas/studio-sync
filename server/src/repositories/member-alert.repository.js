'use strict';

const { Op } = require('sequelize');
const { Member, MemberAlertDismissal } = require('../models');

/**
 * Retrieve dismissal record for a specific member if one exists.
 */
async function findDismissalByMemberId(memberId, options = {}) {
  return MemberAlertDismissal.findOne({
    where: { member_id: Number(memberId) },
    ...options,
  });
}

/**
 * Create a new dismissal record for a member.
 */
async function createDismissal(data, options = {}) {
  return MemberAlertDismissal.create(data, options);
}

/**
 * Delete any dismissal record for a member.
 */
async function deleteDismissalByMemberId(memberId, options = {}) {
  return MemberAlertDismissal.destroy({
    where: { member_id: Number(memberId) },
    ...options,
  });
}

/**
 * Find active eligible members whose membership_expiry <= maxExpiryDate
 * and who have no dismissal record (LEFT JOIN where alertDismissal.id IS NULL).
 */
async function findActiveEligibleMembers(maxExpiryDate, options = {}) {
  return Member.findAll({
    where: {
      membership_expiry: {
        [Op.lte]: maxExpiryDate,
      },
      '$alertDismissal.id$': null,
    },
    include: [
      {
        model: MemberAlertDismissal,
        as: 'alertDismissal',
        required: false,
        attributes: [],
      },
    ],
    order: [
      ['membership_expiry', 'ASC'],
      ['id', 'ASC'],
    ],
    ...options,
  });
}

module.exports = {
  findDismissalByMemberId,
  createDismissal,
  deleteDismissalByMemberId,
  findActiveEligibleMembers,
};
