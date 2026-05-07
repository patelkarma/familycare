import api from './axiosInstance';

export const medicinesApi = {
  getByMember: (memberId) => api.get(`/api/medicines/member/${memberId}`).then((res) => res.data),
  add: (data) => api.post('/api/medicines', data).then((res) => res.data),
  update: (id, data) => api.put(`/api/medicines/${id}`, data).then((res) => res.data),
  delete: (id) => api.delete(`/api/medicines/${id}`).then((res) => res.data),
  markTaken: (id, data) => api.post(`/api/medicines/${id}/mark-taken`, data).then((res) => res.data),
  markSkipped: (id, data) => api.post(`/api/medicines/${id}/mark-skipped`, data).then((res) => res.data),
  takeAsNeeded: (id, notes = '') => api.post(`/api/medicines/${id}/take-now`, { notes }).then((res) => res.data),
  getLogs: (id) => api.get(`/api/medicines/${id}/logs`).then((res) => res.data),
  updateStock: (id, stockCount) => api.put(`/api/medicines/${id}/stock`, { stockCount }).then((res) => res.data),
  resendReminder: (id, doseTiming) => api.post(`/api/medicines/${id}/resend-reminder?doseTiming=${doseTiming}`).then((res) => res.data),
  parsePrescription: (rawText, prescriptionUrl) =>
    api.post('/api/medicines/parse-prescription', { rawText, prescriptionUrl }).then((res) => res.data),
  bulkAdd: async (memberId, medicines) => {
    const results = await Promise.allSettled(
      medicines.map((med) => api.post('/api/medicines', { ...med, familyMemberId: memberId }))
    );
    const added = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.length - added;
    return { added, failed };
  },
};
