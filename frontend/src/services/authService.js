import api from './api';

export const authService = {
  async login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    return data;
  },

  async register(userData) {
    const { data } = await api.post('/auth/register', userData);
    return data;
  },

  async me() {
    const { data } = await api.get('/auth/me');
    return data;
  },

  async forgotPassword(email) {
    const { data } = await api.post('/auth/forgot-password', { email });
    return data;
  },

  async resetPassword(token, newPassword, confirmPassword) {
    const { data } = await api.post('/auth/reset-password', {
      token,
      newPassword,
      confirmPassword,
    });
    return data;
  },
};
