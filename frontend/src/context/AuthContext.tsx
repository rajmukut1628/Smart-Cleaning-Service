import { useNavigate } from 'react-router-dom';
import { imageUrl } from '../utils/imageUrl';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { User } from '../types';
import { API_BASE_URL } from '../config/apiConfig';

// Combine backend response with existing User type
type AuthenticatedUser = User & {
  token?: string;
};

interface AuthContextType {
  user: AuthenticatedUser | null;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithGoogle: (credential: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, phone: string) => Promise<{ verificationId: string; email: string; retryAfter: number }>;
  verifyRegistration: (verificationId: string, code: string) => Promise<void>;
  logout: () => void;
  updateUserProfile: (userData: Partial<AuthenticatedUser>) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = `${API_BASE_URL}/api`;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const establishSession = (userData: any) => {
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
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/login`, { email, password });
      
      establishSession(response.data);
      
      setIsLoading(false);
      return true;
    } catch (error: unknown) {
      console.error('Login failed:', error);
      setIsLoading(false);
      throw error;
    }
  };

  const loginWithGoogle = async (credential: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/google`, { credential });
      establishSession(response.data);
      return true;
    } catch (error) {
      console.error('Google sign-in failed:', error);
      throw error;
    } finally { setIsLoading(false); }
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

