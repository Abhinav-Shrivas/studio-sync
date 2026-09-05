import { request, downloadFile } from './client';

export const sessionApi = {
  getSessions: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.class_id) params.append('class_id', filters.class_id);
    if (filters.from_date) params.append('from_date', filters.from_date);
    if (filters.to_date) params.append('to_date', filters.to_date);
    if (filters.room) params.append('room', filters.room);
    const queryString = params.toString();
    return request(`/sessions${queryString ? `?${queryString}` : ''}`);
  },

  getSessionById: (id) => request(`/sessions/${id}`),

  createSession: (data) =>
    request('/sessions', {
      method: 'POST',
      body: data,
    }),

  updateSession: (id, data) =>
    request(`/sessions/${id}`, {
      method: 'PUT',
      body: data,
    }),

  deleteSession: (id) =>
    request(`/sessions/${id}`, {
      method: 'DELETE',
    }),

  generateRecurring: (data) =>
    request('/sessions/recurring', {
      method: 'POST',
      body: data,
    }),

  addCoInstructor: (sessionId, instructorId) =>
    request(`/sessions/${sessionId}/co-instructors`, {
      method: 'POST',
      body: { instructor_id: instructorId },
    }),

  removeCoInstructor: (sessionId, instructorId) =>
    request(`/sessions/${sessionId}/co-instructors/${instructorId}`, {
      method: 'DELETE',
    }),

  exportAttendanceCsv: (sessionId) =>
    downloadFile(`/sessions/${sessionId}/attendance/export`, `attendance-session-${sessionId}.csv`),
};
