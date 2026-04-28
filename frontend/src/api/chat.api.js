import api from './axiosInstance';

export const chatApi = {
  ask: ({ familyMemberId, message, history }) =>
    api
      .post('/api/chat/ask', { familyMemberId, message, history })
      .then((res) => res.data),
};
