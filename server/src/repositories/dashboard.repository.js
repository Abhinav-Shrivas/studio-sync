'use strict';

const { QueryTypes } = require('sequelize');
const { sequelize } = require('../models');

/**
 * Returns SQL fragment filtering sessions to those where the given instructor
 * is either the primary instructor or an assigned co-instructor.
 */
function getInstructorSessionCondition(instructorId, sessionAlias = 's') {
  if (!instructorId) {
    return '';
  }
  const id = Number(instructorId);
  return `AND (${sessionAlias}."primary_instructor_id" = ${id} OR EXISTS (
    SELECT 1 FROM "session_co_instructors" sci
    WHERE sci."session_id" = ${sessionAlias}."id" AND sci."instructor_id" = ${id}
  ))`;
}

/**
 * Retrieves the 4 headline summary numbers.
 *
 * @param {number|null} instructorId - Null for studio-wide (Staff), or User ID for Instructor.
 * @returns {Promise<{sessionsToday: number, bookingsToday: number, noShowsThisWeek: number, currentlyWaitlisted: number}>}
 */
async function getSummary(instructorId = null) {
  const instrFilterS = getInstructorSessionCondition(instructorId, 's');

  const sessionsTodaySql = `
    SELECT COUNT(*)::int AS count
    FROM "sessions" AS s
    WHERE date_trunc('day', s."start_time") = date_trunc('day', CURRENT_TIMESTAMP)
    ${instrFilterS};
  `;

  const bookingsTodaySql = `
    SELECT COUNT(*)::int AS count
    FROM "bookings" AS b
    JOIN "sessions" AS s ON s."id" = b."session_id"
    WHERE date_trunc('day', b."created_at") = date_trunc('day', CURRENT_TIMESTAMP)
    ${instrFilterS};
  `;

  const noShowsThisWeekSql = `
    SELECT COUNT(*)::int AS count
    FROM "bookings" AS b
    JOIN "sessions" AS s ON s."id" = b."session_id"
    WHERE b."status" = 'NO_SHOW'
      AND date_trunc('week', s."start_time") = date_trunc('week', CURRENT_TIMESTAMP)
    ${instrFilterS};
  `;

  const currentlyWaitlistedSql = `
    SELECT COUNT(*)::int AS count
    FROM "bookings" AS b
    JOIN "sessions" AS s ON s."id" = b."session_id"
    WHERE b."status" = 'WAITLISTED'
    ${instrFilterS};
  `;

  const [
    [sessionsTodayRes],
    [bookingsTodayRes],
    [noShowsThisWeekRes],
    [currentlyWaitlistedRes],
  ] = await Promise.all([
    sequelize.query(sessionsTodaySql, { type: QueryTypes.SELECT }),
    sequelize.query(bookingsTodaySql, { type: QueryTypes.SELECT }),
    sequelize.query(noShowsThisWeekSql, { type: QueryTypes.SELECT }),
    sequelize.query(currentlyWaitlistedSql, { type: QueryTypes.SELECT }),
  ]);

  return {
    sessionsToday: sessionsTodayRes ? Number(sessionsTodayRes.count) : 0,
    bookingsToday: bookingsTodayRes ? Number(bookingsTodayRes.count) : 0,
    noShowsThisWeek: noShowsThisWeekRes ? Number(noShowsThisWeekRes.count) : 0,
    currentlyWaitlisted: currentlyWaitlistedRes ? Number(currentlyWaitlistedRes.count) : 0,
  };
}

/**
 * Retrieves booking counts broken down by status.
 *
 * @param {number|null} instructorId - Null for studio-wide, or User ID for Instructor.
 * @returns {Promise<Array<{status: string, count: number}>>}
 */
async function getBookingsByStatus(instructorId = null) {
  const instrFilterS = getInstructorSessionCondition(instructorId, 's');

  const sql = `
    SELECT b."status", COUNT(*)::int AS count
    FROM "bookings" AS b
    JOIN "sessions" AS s ON s."id" = b."session_id"
    WHERE 1=1
    ${instrFilterS}
    GROUP BY b."status";
  `;

  const results = await sequelize.query(sql, { type: QueryTypes.SELECT });
  return results.map((row) => ({
    status: row.status,
    count: Number(row.count),
  }));
}

/**
 * Retrieves booking counts broken down by class.
 *
 * @param {number|null} instructorId - Null for studio-wide, or User ID for Instructor.
 * @returns {Promise<Array<{classId: number, className: string, count: number}>>}
 */
async function getBookingsByClass(instructorId = null) {
  const instrFilterS = getInstructorSessionCondition(instructorId, 's');

  const sql = `
    SELECT
      c."id" AS "classId",
      c."title" AS "className",
      COUNT(b."id")::int AS count
    FROM "classes" AS c
    JOIN "sessions" AS s ON s."class_id" = c."id"
    JOIN "bookings" AS b ON b."session_id" = s."id"
    WHERE 1=1
    ${instrFilterS}
    GROUP BY c."id", c."title"
    ORDER BY count DESC, c."title" ASC;
  `;

  const results = await sequelize.query(sql, { type: QueryTypes.SELECT });
  return results.map((row) => ({
    classId: Number(row.classId),
    className: row.className,
    count: Number(row.count),
  }));
}

/**
 * Retrieves weekly attendance for the last 8 weeks (current week + 7 preceding weeks) in chronological order.
 * Guarantees all 8 weeks are present with attended: 0 for weeks with no attendance.
 *
 * @param {number|null} instructorId - Null for studio-wide, or User ID for Instructor.
 * @returns {Promise<Array<{week: string, attended: number}>>}
 */
async function getAttendanceByWeek(instructorId = null) {
  const instrFilterS = getInstructorSessionCondition(instructorId, 's');

  const sql = `
    WITH weeks AS (
      SELECT date_trunc('week', CURRENT_DATE - (n || ' weeks')::interval)::date AS week_start
      FROM generate_series(7, 0, -1) AS n
    )
    SELECT
      to_char(w.week_start, 'YYYY-MM-DD') AS week,
      COUNT(b."id")::int AS attended
    FROM weeks w
    LEFT JOIN "sessions" s
      ON date_trunc('week', s."start_time")::date = w.week_start
      ${instrFilterS}
    LEFT JOIN "bookings" b
      ON b."session_id" = s."id"
      AND b."status" = 'ATTENDED'
    GROUP BY w.week_start
    ORDER BY w.week_start ASC;
  `;

  const results = await sequelize.query(sql, { type: QueryTypes.SELECT });
  return results.map((row) => ({
    week: row.week,
    attended: Number(row.attended),
  }));
}

module.exports = {
  getSummary,
  getBookingsByStatus,
  getBookingsByClass,
  getAttendanceByWeek,
};
