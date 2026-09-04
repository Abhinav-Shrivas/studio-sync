'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Clean up any legacy rows where dismissed_by or dismissed_at is NULL.
    // Under the finalized Goal 10 design, member_alert_dismissals contains a row ONLY
    // when an alert has been actually dismissed by staff. Legacy rows representing
    // "undismissed" alerts must be deleted rather than inventing fake actors/timestamps.
    await queryInterface.sequelize.query(`
      DELETE FROM "member_alert_dismissals"
      WHERE "dismissed_by" IS NULL OR "dismissed_at" IS NULL;
    `);

    // 2. Set NOT NULL on dismissed_by (preserving existing FK constraint)
    await queryInterface.changeColumn('member_alert_dismissals', 'dismissed_by', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });

    // 3. Set NOT NULL on dismissed_at
    await queryInterface.changeColumn('member_alert_dismissals', 'dismissed_at', {
      type: Sequelize.DATE,
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    // 1. Revert dismissed_at to nullable
    await queryInterface.changeColumn('member_alert_dismissals', 'dismissed_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // 2. Revert dismissed_by to nullable
    await queryInterface.changeColumn('member_alert_dismissals', 'dismissed_by', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },
};
