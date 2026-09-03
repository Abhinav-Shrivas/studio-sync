'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('bookings', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      member_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'members', key: 'id' },
        onDelete: 'RESTRICT',
      },
      session_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'sessions', key: 'id' },
        onDelete: 'RESTRICT',
      },
      status: {
        type: Sequelize.ENUM('BOOKED', 'WAITLISTED', 'CANCELLED', 'ATTENDED', 'NO_SHOW'),
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      settled_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Indexes from schema.md
    await queryInterface.addIndex('bookings', ['member_id', 'session_id'], {
      name: 'idx_bookings_member_session',
    });
    await queryInterface.addIndex('bookings', ['session_id', 'status'], {
      name: 'idx_bookings_session_status',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('bookings');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_bookings_status";');
  },
};
