import { request } from './client';

export const bookingApi = {
  getBookings: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.status && params.status !== 'ALL') query.append('status', params.status);
    if (params.class_id) query.append('class_id', params.class_id);
    if (params.session_id) query.append('session_id', params.session_id);
    if (params.sort_by) query.append('sort_by', params.sort_by);
    if (params.sort_order || params.order) query.append('sort_order', params.sort_order || params.order);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);

    const qs = query.toString();
    return request(`/bookings${qs ? `?${qs}` : ''}`);
  },

  getBookingById: (id) => request(`/bookings/${id}`),

  createBooking: (data) =>
    request('/bookings', {
      method: 'POST',
      body: data,
    }),

  cancelBooking: (id) =>
    request(`/bookings/${id}/cancel`, {
      method: 'POST',
    }),

  settleAttendance: (id, status, note = null) =>
    request(`/bookings/${id}/settle`, {
      method: 'POST',
      body: { status, ...(note ? { note } : {}) },
    }),

  getTimeline: (id) => request(`/bookings/${id}/timeline`),

  addNote: (id, note) =>
    request(`/bookings/${id}/timeline/notes`, {
      method: 'POST',
      body: { note },
    }),

  addStaffNote: (id, note) =>
    request(`/bookings/${id}/timeline/notes`, {
      method: 'POST',
      body: { note },
    }),
};
