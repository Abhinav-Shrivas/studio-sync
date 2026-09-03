'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Session extends Model {
    static associate(models) {
      Session.belongsTo(models.Class, {
        foreignKey: 'class_id',
        as: 'class',
      });
      Session.belongsTo(models.User, {
        foreignKey: 'primary_instructor_id',
        as: 'primaryInstructor',
      });
      Session.belongsToMany(models.User, {
        through: models.SessionCoInstructor,
        foreignKey: 'session_id',
        otherKey: 'instructor_id',
        as: 'coInstructors',
      });
      Session.hasMany(models.Booking, {
        foreignKey: 'session_id',
        as: 'bookings',
      });
    }
  }

  Session.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      class_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      room: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      start_time: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      capacity: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      duration: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      primary_instructor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Session',
      tableName: 'sessions',
      underscored: true,
      timestamps: true,
    }
  );

  return Session;
};
