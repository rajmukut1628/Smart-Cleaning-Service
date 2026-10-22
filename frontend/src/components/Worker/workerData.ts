import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';

export interface Job {
  _id: string; service?: { name: string; description?: string }; user?: { name: string; address?: string };
  address?: string; scheduledDate: string; scheduledTime: string; specialInstructions?: string;
  status: 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
  beforeImages?: string[]; afterImages?: string[]; workers?: { _id: string; name: string }[];
}
export interface WorkerAccount {
  name: string; email: string; phone?: string; address?: string; bio?: string;
  skills?: string[]; experience?: number; profilePicture?: string;
  availability?: Record<string, { start: string; end: string }>;
}
export interface EarningRow { id: string; amount: number; teamSize: number; date: string; estimatedDate: boolean; paymentStatus: string }
export interface Earnings { totalEarnings: number; paidEarnings: number; pendingEarnings: number; completedJobs: number; monthlyEarnings: Record<string, number>; entries: EarningRow[] }
export const money = (value: number) => new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 2 }).format(value);
export const dateLabel = (date: string) => new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Dhaka' });
export const statusLabel = (value: string) => value === 'in-progress' ? 'In progress' : value.charAt(0).toUpperCase() + value.slice(1);
export function errorMessage(error: unknown) {
  if (!axios.isAxiosError(error)) return 'Something went wrong. Please try again.';
  if (!error.response) return error.code === 'ECONNABORTED' ? 'The server is taking too long to respond. Please try again.' : 'Cannot reach the server. Please try again.';
  if (typeof error.response.data?.message === 'string') return error.response.data.message;
  if (error.response.status === 401) return 'Your session has expired. Please sign in again.';
  if (error.response.status === 403) return 'This information is not available to your account.';
  if (error.response.status === 404) return 'This information is temporarily unavailable. Please try again shortly.';
  return 'The server could not complete the request. Please try again.';
}
export function useWorkerData<T>(url: string) {
  const [data, setData] = useState<T | null>(null); const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => { setLoading(true); setError(''); try { const response = await axios.get<T>(url); setData(response.data); } catch (e) { setError(errorMessage(e)); } finally { setLoading(false); } }, [url]);
  useEffect(() => { void reload(); }, [reload]);
  return { data, setData, error, loading, reload };
}
