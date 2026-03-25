import axios from 'axios';

const API = axios.create({
    baseURL: import.meta.env.MODE === 'production'
        ? 'https://onboardingapp-renderdeployment-backend.onrender.com/api'
        : 'http://localhost:5000/api',
});

// Attach the token to every request
API.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 (expired/invalid token) — clear session and redirect to login
API.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);

export default API;
