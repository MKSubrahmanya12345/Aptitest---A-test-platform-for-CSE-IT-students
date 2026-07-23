import axios from 'axios';

// Use localhost in development, production URL in production
const baseURL = import.meta.env.DEV 
  ? 'http://localhost:5000/api' 
  : 'https://aptitest-5i2d.onrender.com/api';

const api = axios.create({
  baseURL: baseURL,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data && error.response.data.message;
      const isAuthError = status === 401 || (status === 403 && message && message.toLowerCase().includes('token'));
      if (isAuthError) {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
