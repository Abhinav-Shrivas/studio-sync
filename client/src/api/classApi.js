import { request } from './client';

export const classApi = {
  getClasses: (includeArchived = false) =>
    request(`/classes?include_archived=${Boolean(includeArchived)}`),

  getClassById: (id) => request(`/classes/${id}`),

  getClassSessions: (id) => request(`/classes/${id}/sessions`),

  createClass: (data) =>
    request('/classes', {
      method: 'POST',
      body: data,
    }),

  updateClass: (id, data) =>
    request(`/classes/${id}`, {
      method: 'PUT',
      body: data,
    }),

  archiveClass: (id) =>
    request(`/classes/${id}/archive`, {
      method: 'POST',
    }),

  restoreClass: (id) =>
    request(`/classes/${id}/restore`, {
      method: 'POST',
    }),
};
