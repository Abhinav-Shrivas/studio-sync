'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('booking_timeline', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      booking_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'bookings', key: 'id' },
        onDelete: 'RESTRICT',
      },
      from_status: {
        type: Sequelize.ENUM('BOOKED', 'WAITLISTED', 'CANCELLED', 'ATTENDED', 'NO_SHOW'),
        allowNull: true,
      },
      to_status: {
        type: Sequelize.ENUM('BOOKED', 'WAITLISTED', 'CANCELLED', 'ATTENDED', 'NO_SHOW'),
        allowNull: false,
      },
      actor_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
      },
      change_source: {
        type: Sequelize.ENUM('USER', 'SYSTEM'),
        allowNull: false,
      },
      note: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Index from schema.md
    await queryInterface.addIndex('booking_timeline', ['booking_id'], {
      name: 'idx_booking_timeline_booking_id',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('booking_timeline');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_booking_timeline_from_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_booking_timeline_to_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_booking_timeline_change_source";');
  },
};
