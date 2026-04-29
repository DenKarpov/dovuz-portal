import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

// Base URL points to your Spring Boot backend
// Change this to match your actual backend URL
const BASE_URL = 'http://localhost:8080/v1';

// Без глобального Content-Type: иначе multipart-запросы получают application/json и сервер не видит файл.
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (config.data instanceof FormData && config.headers) {
    const h = config.headers;
    if (typeof h.delete === 'function') {
      h.delete('Content-Type');
      h.delete('content-type');
    }
  }
  return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Important:
        // - 401 means "not authenticated" → redirect to login
        // - 403 means "authenticated but forbidden" → do NOT logout/redirect
        //   (otherwise any forbidden request kicks the user out)
        if (error.response?.status === 401) {
            sessionStorage.removeItem('user');
            if (window.location.pathname !== '/login') window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
