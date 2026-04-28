import api from './axiosInstance';

export const familyApi = {
  getMembers: () => api.get('/api/family/members').then((res) => res.data),
  getMember: (id) => api.get(`/api/family/members/${id}`).then((res) => res.data),
  addMember: (data) => api.post('/api/family/members', data).then((res) => res.data),
  updateMember: (id, data) => api.put(`/api/family/members/${id}`, data).then((res) => res.data),
  deleteMember: (id) => api.delete(`/api/family/members/${id}`).then((res) => res.data),
  linkAccount: (memberId, data) => api.post(`/api/family/members/${memberId}/link-account`, data).then((res) => res.data),
  unlinkAccount: (memberId) => api.delete(`/api/family/members/${memberId}/link-account`).then((res) => res.data),
  uploadAvatar: (memberId, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api
      .post(`/api/family/members/${memberId}/avatar`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((res) => res.data);
  },
};
