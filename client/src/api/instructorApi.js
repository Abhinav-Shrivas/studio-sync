import { request } from './client';

export const instructorApi = {
  getActiveClasses: () => request('/instructor/classes'),

  getClassSessions: (classId) => request(`/instructor/classes/${classId}/sessions`),
};
