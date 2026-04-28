import api from './axiosInstance';

export const reportsApi = {
  getByMember: (memberId, { type, from, to, pinned, q } = {}) => {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    if (pinned !== undefined && pinned !== null) params.append('pinned', pinned);
    if (q) params.append('q', q);
    const qs = params.toString();
    return api
      .get(`/api/reports/member/${memberId}${qs ? `?${qs}` : ''}`)
      .then((res) => res.data);
  },

  getById: (id) => api.get(`/api/reports/${id}`).then((res) => res.data),

  getRecent: (limit = 5) =>
    api.get(`/api/reports/recent?limit=${limit}`).then((res) => res.data),

  upload: (metadata, file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append(
      'data',
      new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    );
    return api
      .post('/api/reports', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress,
      })
      .then((res) => res.data);
  },

  update: (id, metadata) =>
    api.put(`/api/reports/${id}`, metadata).then((res) => res.data),

  delete: (id) => api.delete(`/api/reports/${id}`).then((res) => res.data),

  togglePin: (id) => api.post(`/api/reports/${id}/pin`).then((res) => res.data),

  attachAppointment: (id, appointmentId) =>
    api
      .post(`/api/reports/${id}/attach-appointment/${appointmentId}`)
      .then((res) => res.data),

  getShareUrl: (id) =>
    api.get(`/api/reports/${id}/share`).then((res) => res.data),
};
