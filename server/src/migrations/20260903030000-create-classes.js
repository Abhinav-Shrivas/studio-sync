'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('classes', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      discipline: {
        type: Sequelize.ENUM(
          'YOGA',
          'MEDITATION',
          'DANCE',
          'PILATES',
          'ZUMBA',
          'STRENGTH',
          'AEROBICS',
          'MARTIAL_ARTS'
        ),
        allowNull: false,
      },
      default_capacity: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      default_duration: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      is_archived: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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

    // CHECK constraints for positive values
    await queryInterface.sequelize.query(`
      ALTER TABLE "classes"
        ADD CONSTRAINT "chk_classes_default_capacity_positive"
        CHECK ("default_capacity" > 0);
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE "classes"
        ADD CONSTRAINT "chk_classes_default_duration_positive"
        CHECK ("default_duration" > 0);
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('classes');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_classes_discipline";');
  },
};
