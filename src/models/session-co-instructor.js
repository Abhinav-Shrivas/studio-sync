'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SessionCoInstructor extends Model {
    static associate(models) {
      // Associations are defined on Session and User via belongsToMany.
    }
  }

  SessionCoInstructor.init(
    {
      session_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      instructor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
    },
    {
      sequelize,
      modelName: 'SessionCoInstructor',
      tableName: 'session_co_instructors',
      underscored: true,
      timestamps: false,
    }
  );

  return SessionCoInstructor;
};
