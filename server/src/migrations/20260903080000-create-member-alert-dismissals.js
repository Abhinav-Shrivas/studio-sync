'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('member_alert_dismissals', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      member_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'members', key: 'id' },
        onDelete: 'CASCADE',
      },
      dismissed_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
      },
      dismissed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      dismissed_expiry: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
    });

    // Index from schema.md
    await queryInterface.addIndex('member_alert_dismissals', ['dismissed_expiry'], {
      name: 'idx_member_alert_dismissals_dismissed_expiry',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('member_alert_dismissals');
  },
};
