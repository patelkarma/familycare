import api from './axiosInstance';

export const sosApi = {
  // ───────── Trigger ─────────
  trigger: ({ memberId, latitude, longitude, accuracyMeters }) =>
    api
      .post('/api/sos/trigger', { memberId, latitude, longitude, accuracyMeters })
      .then((res) => res.data),

  // ───────── Emergency Contacts ─────────
  getContacts: (memberId) =>
    api.get(`/api/sos/contacts/member/${memberId}`).then((res) => res.data),

  createContact: (data) =>
    api.post('/api/sos/contacts', data).then((res) => res.data),

  updateContact: (id, data) =>
    api.put(`/api/sos/contacts/${id}`, data).then((res) => res.data),

  deleteContact: (id) =>
    api.delete(`/api/sos/contacts/${id}`).then((res) => res.data),

  setPrimary: (id) =>
    api.post(`/api/sos/contacts/${id}/primary`).then((res) => res.data),

  // ───────── Event history ─────────
  getEvents: (memberId) =>
    api.get(`/api/sos/events/member/${memberId}`).then((res) => res.data),

  getEvent: (id) =>
    api.get(`/api/sos/events/${id}`).then((res) => res.data),

  // ───────── Test SMS ─────────
  sendTestSms: () =>
    api.post('/api/sos/test-sms').then((res) => res.data),
};
