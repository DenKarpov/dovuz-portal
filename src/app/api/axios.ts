import axios from 'axios';

// Base URL points to your Spring Boot backend
// Change this to match your actual backend URL
const BASE_URL = 'http://localhost:8080/v1';

const api = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 403) {
            // Token expired or unauthorized – clear session
            sessionStorage.removeItem('user');
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
