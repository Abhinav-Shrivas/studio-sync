'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Booking extends Model {
    static associate(models) {
      Booking.belongsTo(models.Member, {
        foreignKey: 'member_id',
        as: 'member',
      });
      Booking.belongsTo(models.Session, {
        foreignKey: 'session_id',
        as: 'session',
      });
      Booking.hasMany(models.BookingTimeline, {
        foreignKey: 'booking_id',
        as: 'timeline',
      });
    }
  }

  Booking.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      member_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      session_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('BOOKED', 'WAITLISTED', 'CANCELLED', 'ATTENDED', 'NO_SHOW'),
        allowNull: false,
      },
      settled_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Booking',
      tableName: 'bookings',
      underscored: true,
      timestamps: true,
    }
  );

  return Booking;
};
