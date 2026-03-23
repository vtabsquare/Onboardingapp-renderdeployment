import axios from 'axios';

const API = axios.create({
    baseURL: import.meta.env.MODE === 'production'
        ? 'https://onboardingapp-renderdeployment-backend.onrender.com/api'
        : 'http://localhost:5000/api',
});

// Add a request interceptor to attach the token
API.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default API;
