import { API_BASE_URL } from '../config/apiConfig';
export function imageUrl(value?: string): string {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return API_BASE_URL.replace(/\/$/, '') + '/' + value.replace(/^\//, '');
}
