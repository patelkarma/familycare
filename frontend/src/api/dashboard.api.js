import api from './axiosInstance';

export const dashboardApi = {
  getSummary: () => api.get('/api/dashboard/summary').then((res) => res.data),
};
