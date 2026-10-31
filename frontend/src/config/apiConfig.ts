// Dynamic API base URL configuration
export const getApiBaseUrl = (): string => {
  // Same-origin development proxy forwards REST, images and Socket.IO to live.
  if (import.meta.env.DEV && import.meta.env.MODE === 'live') return window.location.origin;
  // Use environment variable if available
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  // Fallback to localhost during development
  return 'http://localhost:5003';
};

export const API_BASE_URL = getApiBaseUrl();
