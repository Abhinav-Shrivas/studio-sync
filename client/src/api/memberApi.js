import { request } from './client';

export const memberApi = {
  getMembers: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search && params.search.trim()) {
      query.append('search', params.search.trim());
    }
    const qStr = query.toString();
    return request(`/members${qStr ? '?' + qStr : ''}`);
  },

  getMemberById: (id) => request(`/members/${id}`),

  createMember: (data) =>
    request('/members', {
      method: 'POST',
      body: data,
    }),

  updateMember: (memberId, data) =>
    request(`/members/${memberId}`, {
      method: 'PATCH',
      body: data,
    }),

  getAlerts: () => request('/membership-alerts'),

  dismissAlert: (memberId) =>
    request(`/membership-alerts/${memberId}/dismiss`, {
      method: 'POST',
    }),

  updateMemberExpiry: (memberId, membership_expiry) =>
    request(`/members/${memberId}`, {
      method: 'PATCH',
      body: { membership_expiry },
    }),
};
