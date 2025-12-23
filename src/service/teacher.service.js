import express from 'express';
import { $ZodCheckSizeEquals } from 'zod/v4/core';
import sequelize from '../db.js';

exports.getChildrenByTeacher = async (teacherId) => {
  const [rows] = await sequelize.query('SELECT * FROM child WHERE teacher_id = :teacherId', {
    replacements: { teacherId },
  });
  return rows;
};
/// الأستاذ يطلع التقرير (CREATE)

exports.createChildReport = async ({
  child_id,
  date,
  foodIntake,
  activitylevel,
  sleepQuality,
  behavoir,
  generalNotes,
}) => {
  await sequelize.query(
    `INSERT INTO reports
        (child_id,
    date,
    foodIntake,
    activitylevel,
    sleepQuality,
    behavoir,
    generalNotes)

        VALUES 
        (:child_id,
        :date,
        :foodIntake,
        :activitylevel,
        :sleepQuality,
        :behavoir,
        :generalNotes)`,

    {
      replacements: {
        child_id,
        date,
        foodIntake,
        activitylevel,
        sleepQuality,
        behavoir,
        generalNotes,
      },
    }
  );
};
