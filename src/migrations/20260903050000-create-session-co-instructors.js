'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('session_co_instructors', {
      session_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: 'sessions', key: 'id' },
        onDelete: 'CASCADE',
      },
      instructor_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('session_co_instructors');
  },
};
