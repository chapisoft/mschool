'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface User {
  username: string;
  fullName: string;
  role: string;
  avatarText: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Kiểm tra phiên đăng nhập từ localStorage
    const storedAuth = typeof window !== 'undefined' ? localStorage.getItem('mschool_auth') : null;
    if (storedAuth) {
      try {
        const parsed = JSON.parse(storedAuth);
        setUser(parsed);
      } catch (e) {
        localStorage.removeItem('mschool_auth');
        setUser(null);
      }
    } else {
      setUser(null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Điều hướng nếu chưa đăng nhập
    if (!isLoading) {
      if (!user && pathname !== '/login') {
        router.replace('/login');
      } else if (user && pathname === '/login') {
        router.replace('/dashboard');
      }
    }
  }, [user, isLoading, pathname, router]);

  const login = async (username: string, password: string): Promise<{ success: boolean; message?: string }> => {
    // Hỗ trợ tài khoản quản trị mẫu tiêu chuẩn
    if ((username === 'admin' && password === 'Admin@2026') || (username === 'ban_giam_hieu' && password === 'School@2026')) {
      const authUser: User = {
        username: username,
        fullName: username === 'admin' ? 'Quản Trị Viên Hệ Thống' : 'Ban Giám Hiệu Nhà Trường',
        role: 'ADMIN',
        avatarText: username === 'admin' ? 'AD' : 'GH',
      };
      localStorage.setItem('mschool_auth', JSON.stringify(authUser));
      setUser(authUser);
      return { success: true };
    }

    return {
      success: false,
      message: 'Tài khoản hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.',
    };
  };

  const logout = () => {
    localStorage.removeItem('mschool_auth');
    setUser(null);
    router.replace('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
