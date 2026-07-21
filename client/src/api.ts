import axios from 'axios';

// Create an axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

// You can also add interceptors here in the future. For example, to automatically
// add an authentication token to every request.

export default api;