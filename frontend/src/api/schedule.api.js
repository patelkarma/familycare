import api from './axiosInstance';

export const scheduleApi = {
  getMyDaily: (date) =>
    api.get('/api/schedule/my-daily', { params: { date } }).then((res) => res.data),

  getMemberDaily: (memberId, date) =>
    api.get('/api/schedule/daily', { params: { memberId, date } }).then((res) => res.data),

  getFamilyOverview: (date) =>
    api.get('/api/schedule/family-overview', { params: { date } }).then((res) => res.data),

  getAdherenceSummary: (month, year) =>
    api.get('/api/schedule/adherence-summary', { params: { month, year } }).then((res) => res.data),
};
