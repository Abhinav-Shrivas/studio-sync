'use strict';

const dashboardRepository = require('../repositories/dashboard.repository');
const { ForbiddenError } = require('../utils/errors');

const ALL_STATUSES = ['BOOKED', 'WAITLISTED', 'CANCELLED', 'ATTENDED', 'NO_SHOW'];

/**
 * Returns dashboard metrics for the authenticated user.
 * - STAFF: studio-wide statistics.
 * - INSTRUCTOR: statistics strictly scoped to sessions where they are primary or co-instructor.
 *
 * @param {object} user - Authenticated user context
 * @returns {Promise<object>} Dashboard payload
 */
async function getDashboardData(user) {
  if (!user || !['STAFF', 'INSTRUCTOR'].includes(user.role)) {
    throw new ForbiddenError('Insufficient permissions');
  }

  const instructorId = user.role === 'INSTRUCTOR' ? user.id : null;

  const [summary, rawStatusBreakdown, bookingsByClass, attendanceByWeek] = await Promise.all([
    dashboardRepository.getSummary(instructorId),
    dashboardRepository.getBookingsByStatus(instructorId),
    dashboardRepository.getBookingsByClass(instructorId),
    dashboardRepository.getAttendanceByWeek(instructorId),
  ]);

  // Ensure all 5 valid booking statuses are represented in bookingsByStatus
  const statusCountMap = new Map(rawStatusBreakdown.map((item) => [item.status, item.count]));
  const bookingsByStatus = ALL_STATUSES.map((status) => ({
    status,
    count: statusCountMap.get(status) || 0,
  }));

  return {
    summary,
    bookingsByStatus,
    bookingsByClass,
    attendanceByWeek,
  };
}

module.exports = {
  getDashboardData,
};
