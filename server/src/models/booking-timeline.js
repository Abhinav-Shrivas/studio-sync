'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BookingTimeline extends Model {
    static associate(models) {
      BookingTimeline.belongsTo(models.Booking, {
        foreignKey: 'booking_id',
        as: 'booking',
      });
      BookingTimeline.belongsTo(models.User, {
        foreignKey: 'actor_id',
        as: 'actor',
      });
    }
  }

  BookingTimeline.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      booking_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      from_status: {
        type: DataTypes.ENUM('BOOKED', 'WAITLISTED', 'CANCELLED', 'ATTENDED', 'NO_SHOW'),
        allowNull: true,
      },
      to_status: {
        type: DataTypes.ENUM('BOOKED', 'WAITLISTED', 'CANCELLED', 'ATTENDED', 'NO_SHOW'),
        allowNull: false,
      },
      actor_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      change_source: {
        type: DataTypes.ENUM('USER', 'SYSTEM'),
        allowNull: false,
      },
      note: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'BookingTimeline',
      tableName: 'booking_timeline',
      underscored: true,
      timestamps: true,
      updatedAt: false,
    }
  );

  return BookingTimeline;
};
