import api from './axiosInstance';

export const pharmacyApi = {
  getNearby: ({ lat, lng, radius = 2000 }) =>
    api
      .get('/api/pharmacy/nearby', { params: { lat, lng, radius } })
      .then((res) => res.data),
};
