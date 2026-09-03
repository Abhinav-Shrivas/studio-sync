'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.hasMany(models.Session, {
        foreignKey: 'primary_instructor_id',
        as: 'primarySessions',
      });
      User.belongsToMany(models.Session, {
        through: models.SessionCoInstructor,
        foreignKey: 'instructor_id',
        otherKey: 'session_id',
        as: 'coInstructedSessions',
      });
      User.hasMany(models.BookingTimeline, {
        foreignKey: 'actor_id',
        as: 'timelineActions',
      });
      User.hasMany(models.MemberAlertDismissal, {
        foreignKey: 'dismissed_by',
        as: 'alertDismissals',
      });
    }
  }

  User.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      password_hash: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM('STAFF', 'INSTRUCTOR'),
        allowNull: false,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      underscored: true,
      timestamps: true,
    }
  );

  return User;
};
