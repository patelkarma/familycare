import api from './axiosInstance';

export const pillApi = {
  // Vision calls take longer than chat — bump timeout to 60s.
  identify: ({ familyMemberId, imageBase64, mimeType }) =>
    api
      .post(
        '/api/pill/identify',
        { familyMemberId, imageBase64, mimeType },
        { timeout: 60000 }
      )
      .then((res) => res.data),
};
