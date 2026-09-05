'use strict';

const { Op } = require('sequelize');
const { sequelize } = require('../models');
const memberRepository = require('../repositories/member.repository');
const memberAlertRepository = require('../repositories/member-alert.repository');
const { ValidationError, NotFoundError, ConflictError } = require('../utils/errors');

/**
 * Gets all members with optional search by name or email.
 */
async function getAllMembers(query = {}) {
  const { search } = query;
  const where = {};

  if (search && typeof search === 'string' && search.trim()) {
    const term = `%${search.trim()}%`;
    where[Op.or] = [
      { name: { [Op.iLike]: term } },
      { email: { [Op.iLike]: term } },
    ];
  }

  return memberRepository.findAll({
    where,
    order: [['name', 'ASC']],
  });
}

/**
 * Gets a single member by ID.
 */
async function getMemberById(id) {
  const parsedId = Number(id);
  if (!parsedId || isNaN(parsedId)) {
    throw new ValidationError('Invalid member ID');
  }

  const member = await memberRepository.findById(parsedId);
  if (!member) {
    throw new NotFoundError('Member not found');
  }
  return member;
}

/**
 * Creates a new member.
 */
async function createMember(data, user = null) {
  const { name, email, membership_expiry } = data || {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    throw new ValidationError('Member name is required');
  }

  if (!email || typeof email !== 'string' || !email.trim()) {
    throw new ValidationError('Valid email is required');
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existing = await memberRepository.findByEmail(normalizedEmail);
  if (existing) {
    throw new ConflictError('A member with this email already exists');
  }

  if (!membership_expiry || typeof membership_expiry !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(membership_expiry.trim())) {
    throw new ValidationError('Invalid membership expiry date. Expected YYYY-MM-DD format.');
  }

  const parsedDate = new Date(`${membership_expiry.trim()}T00:00:00.000Z`);
  if (isNaN(parsedDate.getTime())) {
    throw new ValidationError('Invalid membership expiry date.');
  }

  return memberRepository.create({
    name: name.trim(),
    email: normalizedEmail,
    membership_expiry: membership_expiry.trim(),
  });
}

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

  if ('name' in payload) {
    if (!payload.name || typeof payload.name !== 'string' || !payload.name.trim()) {
      throw new ValidationError('Name is required');
    }
    payload.name = payload.name.trim();
  }

  if ('email' in payload) {
    if (!payload.email || typeof payload.email !== 'string' || !payload.email.trim()) {
      throw new ValidationError('Valid email is required');
    }
    payload.email = payload.email.toLowerCase().trim();
    if (payload.email !== member.email) {
      const existing = await memberRepository.findByEmail(payload.email);
      if (existing && existing.id !== parsedId) {
        throw new ConflictError('A member with this email already exists');
      }
    }
  }

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
  getAllMembers,
  getMemberById,
  createMember,
  updateMember,
};
