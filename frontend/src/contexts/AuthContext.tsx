import React, { createContext, useContext, useState, useEffect } from 'react';
import { useWallet } from './WalletContext';
import { api } from '../services/api';

interface User {
  id: string;
  wallet_address: string;
  username?: string;
  email?: string;
  created_at: string;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (walletAddress: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { connected, publicKey } = useWallet();

  useEffect(() => {
    if (connected && publicKey) {
      login(publicKey);
    } else {
      setLoading(false);
    }
  }, [connected, publicKey]);

  const login = async (walletAddress: string) => {
    try {
      setLoading(true);
      
      // Create or get user
      const response = await api.post('/users/', {
        wallet_address: walletAddress,
      });
      
      setUser(response.data);
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
