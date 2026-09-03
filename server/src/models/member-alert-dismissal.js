'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MemberAlertDismissal extends Model {
    static associate(models) {
      MemberAlertDismissal.belongsTo(models.Member, {
        foreignKey: 'member_id',
        as: 'member',
      });
      MemberAlertDismissal.belongsTo(models.User, {
        foreignKey: 'dismissed_by',
        as: 'dismissedByUser',
      });
    }
  }

  MemberAlertDismissal.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      member_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
      },
      dismissed_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      dismissed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      dismissed_expiry: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'MemberAlertDismissal',
      tableName: 'member_alert_dismissals',
      underscored: true,
      timestamps: false,
    }
  );

  return MemberAlertDismissal;
};
