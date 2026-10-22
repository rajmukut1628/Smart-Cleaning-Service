import {createContext,useContext} from 'react';
import type {User} from '../types';
// Combine backend response with existing User type
export type AuthenticatedUser = User & {
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

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

