'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Remove index first, then column
    await queryInterface.removeIndex('member_alert_dismissals', 'idx_member_alert_dismissals_dismissed_expiry');
    await queryInterface.removeColumn('member_alert_dismissals', 'dismissed_expiry');
  },

  async down(queryInterface, Sequelize) {
    // Re-add column and index
    await queryInterface.addColumn('member_alert_dismissals', 'dismissed_expiry', {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });
    await queryInterface.addIndex('member_alert_dismissals', ['dismissed_expiry'], {
      name: 'idx_member_alert_dismissals_dismissed_expiry',
    });
  },
};
