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

module.exports = {
  findById,
  findByEmail,
};
