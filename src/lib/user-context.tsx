'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Vendor, Role } from '@/types';
import { INITIAL_USERS, INITIAL_VENDORS } from './mock-data';

interface UserContextType {
  currentUser: User | null;
  currentVendor: Vendor | null;
  switchUser: (role: Role, vendorId?: string) => void;
  loginWithEmail: (email: string, password?: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  registerUser: (payload: any) => Promise<{ success: boolean; user?: User; error?: string }>;
  updateCurrentVendor: (updates: Partial<Vendor>) => void;
  logout: () => void;
  availableUsers: User[];
  availableVendors: Vendor[];
  isLoaded: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  // Starts logged out (null) by default
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentVendor, setCurrentVendor] = useState<Vendor | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Restore session from localStorage if present
  useEffect(() => {
    try {
      const stored = localStorage.getItem('feirae_user_session');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.user) {
          setCurrentUser(parsed.user);
          setCurrentVendor(parsed.vendor || null);
        }
      }
    } catch {
      // ignore
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const switchUser = (role: Role, vendorId?: string) => {
    if (role === 'CLIENT') {
      const user = INITIAL_USERS[0];
      setCurrentUser(user);
      setCurrentVendor(null);
      localStorage.setItem('feirae_user_session', JSON.stringify({ user, vendor: null }));
    } else if (role === 'VENDOR') {
      const selectedVendor = vendorId 
        ? INITIAL_VENDORS.find(v => v.id === vendorId) || INITIAL_VENDORS[0]
        : INITIAL_VENDORS[0];
      const vendorUser = INITIAL_USERS.find(u => u.id === selectedVendor.userId) || INITIAL_USERS[1];
      setCurrentUser(vendorUser);
      setCurrentVendor(selectedVendor);
      localStorage.setItem('feirae_user_session', JSON.stringify({ user: vendorUser, vendor: selectedVendor }));
    } else if (role === 'ADMIN') {
      const adminUser = INITIAL_USERS[4];
      setCurrentUser(adminUser);
      setCurrentVendor(null);
      localStorage.setItem('feirae_user_session', JSON.stringify({ user: adminUser, vendor: null }));
    }
  };

  const loginWithEmail = async (email: string, password?: string) => {
    const cleanEmail = email.trim().toLowerCase();

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      const data = await res.json();
      if (res.ok && data.user) {
        setCurrentUser(data.user);
        setCurrentVendor(data.vendor || null);
        localStorage.setItem('feirae_user_session', JSON.stringify({ user: data.user, vendor: data.vendor }));
        return { success: true, user: data.user };
      } else {
        return { success: false, error: data.error || 'Credenciais inválidas.' };
      }
    } catch (err) {
      console.warn('API auth error, using local fallback:', err);
    }

    // Fallback to local accounts
    const foundUser = INITIAL_USERS.find(u => u.email.toLowerCase() === cleanEmail);
    if (!foundUser) {
      return { success: false, error: 'E-mail não encontrado entre as contas cadastradas.' };
    }

    let vendorObj: Vendor | null = null;
    if (foundUser.role === 'VENDOR') {
      vendorObj = INITIAL_VENDORS.find(v => v.userId === foundUser.id) || INITIAL_VENDORS[0];
      setCurrentUser(foundUser);
      setCurrentVendor(vendorObj);
    } else if (foundUser.role === 'ADMIN') {
      setCurrentUser(foundUser);
      setCurrentVendor(null);
    } else {
      setCurrentUser(foundUser);
      setCurrentVendor(null);
    }

    localStorage.setItem('feirae_user_session', JSON.stringify({ user: foundUser, vendor: vendorObj }));
    return { success: true, user: foundUser };
  };

  const registerUser = async (payload: any) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.user) {
        setCurrentUser(data.user);
        setCurrentVendor(data.vendor || null);
        localStorage.setItem('feirae_user_session', JSON.stringify({ user: data.user, vendor: data.vendor }));
        return { success: true, user: data.user };
      } else {
        return { success: false, error: data.error || 'Erro ao registrar usuário.' };
      }
    } catch (err) {
      return { success: false, error: 'Erro de conexão com o servidor.' };
    }
  };

  const updateCurrentVendor = (updates: Partial<Vendor>) => {
    if (!currentVendor) return;
    const updated = { ...currentVendor, ...updates };
    setCurrentVendor(updated);
    if (currentUser) {
      localStorage.setItem('feirae_user_session', JSON.stringify({ user: currentUser, vendor: updated }));
    }
  };

  const logout = () => {
    setCurrentUser(null);
    setCurrentVendor(null);
    localStorage.removeItem('feirae_user_session');
  };

  return (
    <UserContext.Provider value={{
      currentUser,
      currentVendor,
      switchUser,
      loginWithEmail,
      registerUser,
      updateCurrentVendor,
      logout,
      availableUsers: INITIAL_USERS,
      availableVendors: INITIAL_VENDORS,
      isLoaded,
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within a UserProvider');
  return context;
}
