'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Member extends Model {
    static associate(models) {
      Member.hasMany(models.Booking, {
        foreignKey: 'member_id',
        as: 'bookings',
      });
      Member.hasOne(models.MemberAlertDismissal, {
        foreignKey: 'member_id',
        as: 'alertDismissal',
      });
    }
  }

  Member.init(
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
      membership_expiry: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Member',
      tableName: 'members',
      underscored: true,
      timestamps: true,
    }
  );

  return Member;
};
