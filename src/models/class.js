'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Class extends Model {
    static associate(models) {
      Class.hasMany(models.Session, {
        foreignKey: 'class_id',
        as: 'sessions',
      });
    }
  }

  Class.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      discipline: {
        type: DataTypes.ENUM(
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
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      default_duration: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      is_archived: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: 'Class',
      tableName: 'classes',
      underscored: true,
      timestamps: true,
    }
  );

  return Class;
};
