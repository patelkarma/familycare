import api from './axiosInstance';

export const interactionsApi = {
  check: ({ memberId, drugName }) =>
    api
      .get('/api/interactions/check', { params: { memberId, drugName } })
      .then((res) => res.data),
};
