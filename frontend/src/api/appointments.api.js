import api from './axiosInstance';

export const appointmentsApi = {
  getByMember: (memberId) => api.get(`/api/appointments/member/${memberId}`).then((res) => res.data),
  getUpcoming: (memberId) => api.get(`/api/appointments/member/${memberId}/upcoming`).then((res) => res.data),
  add: (data) => api.post('/api/appointments', data).then((res) => res.data),
  update: (id, data) => api.put(`/api/appointments/${id}`, data).then((res) => res.data),
  delete: (id) => api.delete(`/api/appointments/${id}`).then((res) => res.data),
};
