import { useNavigate } from 'react-router-dom';
import { imageUrl } from '../utils/imageUrl';
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {AuthContext,type AuthenticatedUser} from './authState';
import { API_BASE_URL } from '../config/apiConfig';

const API_URL = `${API_BASE_URL}/api`;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const establishSession = (userData: Omit<AuthenticatedUser,'id'> & {_id:string}) => {
    const authenticatedUser: AuthenticatedUser = {
      id: userData._id,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      phone: userData.phone || '',
      avatar: userData.profilePicture ? imageUrl(userData.profilePicture) : '',
      address: userData.address || '',
      token: userData.token,
    };
    setUser(authenticatedUser);
    localStorage.setItem('bd-clean-user', JSON.stringify(authenticatedUser));
    axios.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
  };

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('bd-clean-user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        if (parsedUser.token) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${parsedUser.token}`;
        }
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        localStorage.removeItem('bd-clean-user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, { email, password }, { timeout: 90000 });
      
      establishSession(response.data);
      
      return true;
    } catch (error: unknown) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const loginWithGoogle = async (credential: string): Promise<boolean> => {
    try {
      const response = await axios.post(`${API_URL}/auth/google`, { credential }, { timeout: 90000 });
      establishSession(response.data);
      return true;
    } catch (error) {
      console.error('Google sign-in failed:', error);
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string, phone: string): Promise<{ verificationId: string; email: string; retryAfter: number }> => {
    // Creating an account does not establish an authenticated session.
    const { data } = await axios.post(`${API_URL}/auth/register`, { name, email, password, phone });
    return data;
  };
  const verifyRegistration = async (verificationId: string, code: string): Promise<void> => {
    const { data } = await axios.post(API_URL + '/auth/register/verify', { verificationId, code });
    establishSession(data);
  };
  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('bd-clean-user');
    delete axios.defaults.headers.common['Authorization'];
    navigate('/', { replace: true });
  }, [navigate]);

  useEffect(() => {
    const expire = () => logout();
    window.addEventListener('session-expired', expire);
    return () => window.removeEventListener('session-expired', expire);
  }, [logout]);

  const updateUserProfile = (userData: Partial<AuthenticatedUser>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem('bd-clean-user', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, loginWithGoogle, register, verifyRegistration, logout, updateUserProfile, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

