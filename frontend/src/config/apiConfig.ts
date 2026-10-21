// Dynamic API base URL configuration
export const getApiBaseUrl = (): string => {
  // Use environment variable if available
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  // Fallback to localhost during development
  return 'http://localhost:5003';
};

export const API_BASE_URL = getApiBaseUrl();
