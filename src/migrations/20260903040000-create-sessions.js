'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sessions', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      class_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'classes', key: 'id' },
        onDelete: 'RESTRICT',
      },
      room: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      start_time: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      capacity: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      duration: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      primary_instructor_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // CHECK constraints
    await queryInterface.sequelize.query(`
      ALTER TABLE "sessions"
        ADD CONSTRAINT "chk_sessions_capacity_positive"
        CHECK ("capacity" > 0);
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE "sessions"
        ADD CONSTRAINT "chk_sessions_duration_positive"
        CHECK ("duration" > 0);
    `);

    // Indexes from schema.md
    await queryInterface.addIndex('sessions', ['class_id'], {
      name: 'idx_sessions_class_id',
    });
    await queryInterface.addIndex('sessions', ['room', 'start_time'], {
      name: 'idx_sessions_room_start_time',
    });
    await queryInterface.addIndex('sessions', ['primary_instructor_id', 'start_time'], {
      name: 'idx_sessions_primary_instructor_start_time',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('sessions');
  },
};
