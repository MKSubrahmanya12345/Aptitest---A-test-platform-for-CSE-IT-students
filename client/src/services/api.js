import axios from 'axios';

// Use localhost in development, production URL in production
const baseURL = import.meta.env.DEV 
  ? 'http://localhost:5000/api' 
  : 'https://aptitest-5i2d.onrender.com/api';

const api = axios.create({
  baseURL: baseURL,
});


console.log("DEV:", import.meta.env.DEV);
console.log("BASE URL:", baseURL);

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
      const isTokenError = message && (
        message.toLowerCase().includes('token') ||
        message.toLowerCase().includes('invalid') ||
        message.toLowerCase().includes('unauthorized')
      );
      const isEmailVerificationError = message && message.toLowerCase().includes('verify your email');

      // Only redirect for token/auth errors, not for email verification errors
      if ((status === 401 && !isEmailVerificationError) || (status === 403 && isTokenError)) {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
