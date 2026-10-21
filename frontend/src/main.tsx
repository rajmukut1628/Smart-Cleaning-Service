import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import axios from 'axios';
import { API_BASE_URL } from './config/apiConfig';

import ErrorBoundary from './components/common/ErrorBoundary.tsx';
import { BrowserRouter } from 'react-router-dom'; // Import BrowserRouter

// Set axios default baseURL
axios.defaults.baseURL = API_BASE_URL;

// Add auth token interceptor
axios.interceptors.request.use(
  (config) => {
    const userDataJSON = localStorage.getItem('bd-clean-user');
    if (userDataJSON) {
      try {
        const userData = JSON.parse(userDataJSON);
        const token = userData.token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.error('Failed to parse user data from localStorage:', error);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axios.interceptors.response.use(response => response, error => {
  if (error.response?.status === 401 && !/\/auth\/(login|register)/.test(error.config?.url || '')) {
    localStorage.removeItem('bd-clean-user');
    delete axios.defaults.headers.common.Authorization;
    window.dispatchEvent(new Event('session-expired'));
  }
  return Promise.reject(error);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter> {/* Wrap with BrowserRouter */}
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>
);
