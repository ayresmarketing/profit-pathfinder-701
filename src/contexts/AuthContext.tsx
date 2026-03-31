import React, { createContext, useContext, useState, useCallback } from 'react';

interface AuthContextValue {
  isAuthenticated: boolean;
  userEmail: string | null;
  login: (email: string, password: string, rememberMe?: boolean) => boolean;
  logout: () => void;
}

const USERS = [
  { email: 'ayresmarketingoficial@gmail.com', password: '12345' },
];

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('auth') === 'true';
  });
  const [userEmail, setUserEmail] = useState<string | null>(() => {
    return localStorage.getItem('authEmail');
  });

  const login = useCallback((email: string, password: string) => {
    const user = USERS.find(u => u.email === email.toLowerCase().trim() && u.password === password);
    if (user) {
      setIsAuthenticated(true);
      setUserEmail(user.email);
      localStorage.setItem('auth', 'true');
      localStorage.setItem('authEmail', user.email);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setUserEmail(null);
    localStorage.removeItem('auth');
    localStorage.removeItem('authEmail');
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, userEmail, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
