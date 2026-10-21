import React, { createContext, useContext, useState, useEffect } from 'react';
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
  register: (name: string, email: string, password: string, phone: string) => Promise<boolean>;
  logout: () => void;
  updateUserProfile: (userData: Partial<AuthenticatedUser>) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = `${API_BASE_URL}/api`;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      
      const userData = response.data;
      const authenticatedUser: AuthenticatedUser = {
        id: userData._id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        phone: userData.phone || '',
        avatar: userData.profilePicture ? `${API_BASE_URL}${userData.profilePicture}` : '',
        address: userData.address || '',
        token: userData.token,
      };

      setUser(authenticatedUser);
      localStorage.setItem('bd-clean-user', JSON.stringify(authenticatedUser));
      axios.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
      
      setIsLoading(false);
      return true;
    } catch (error: unknown) {
      console.error('Login failed:', error);
      setIsLoading(false);
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string, phone: string): Promise<boolean> => {
    // Creating an account does not establish an authenticated session.
    await axios.post(`${API_URL}/auth/register`, { name, email, password, phone });
    return true;
  };
  const logout = () => {
    setUser(null);
    localStorage.removeItem('bd-clean-user');
    delete axios.defaults.headers.common['Authorization'];
  };

  useEffect(() => {
    const expire = () => setUser(null);
    window.addEventListener('session-expired', expire);
    return () => window.removeEventListener('session-expired', expire);
  }, []);

  const updateUserProfile = (userData: Partial<AuthenticatedUser>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem('bd-clean-user', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUserProfile, isLoading }}>
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

