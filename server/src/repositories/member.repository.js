'use strict';

const { Member } = require('../models');

async function findById(id, options = {}) {
  return Member.findByPk(Number(id), options);
}

async function findByEmail(email, options = {}) {
  return Member.findOne({
    where: { email: email.toLowerCase().trim() },
    ...options,
  });
}

async function update(id, updateData, options = {}) {
  const member = await findById(id, options);
  if (!member) {
    return null;
  }
  return member.update(updateData, options);
}

module.exports = {
  findById,
  findByEmail,
  update,
};

