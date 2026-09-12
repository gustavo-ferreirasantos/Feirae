'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Vendor, Role } from '@/types';

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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentVendor, setCurrentVendor] = useState<Vendor | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [availableVendors, setAvailableVendors] = useState<Vendor[]>([]);

  // Fetch real users and vendors from PostgreSQL database on load
  const loadDatabaseAccounts = async () => {
    try {
      const res = await fetch('/api/auth');
      if (res.ok) {
        const data = await res.json();
        const dbUsers: User[] = data.users || [];
        const dbVendors: Vendor[] = data.vendors || [];

        setAvailableUsers(dbUsers);
        setAvailableVendors(dbVendors);

        // Validate any session stored in localStorage against real database records
        const stored = localStorage.getItem('feirae_user_session');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            const userInDb = dbUsers.find(u => 
              u.id === parsed?.user?.id || 
              (parsed?.user?.email && u.email?.toLowerCase() === parsed.user.email.toLowerCase())
            );

            if (!userInDb) {
              // The user stored in localStorage does not exist in the database (e.g. old mock or reset DB)
              console.warn('Limpando sessão antiga/inexistente no banco de dados...');
              localStorage.removeItem('feirae_user_session');
              setCurrentUser(null);
              setCurrentVendor(null);
            } else {
              const vendorInDb = dbVendors.find(v => v.userId === userInDb.id);
              setCurrentUser(userInDb);
              setCurrentVendor(vendorInDb || null);
              localStorage.setItem('feirae_user_session', JSON.stringify({ user: userInDb, vendor: vendorInDb || null }));
            }
          } catch {
            localStorage.removeItem('feirae_user_session');
            setCurrentUser(null);
            setCurrentVendor(null);
          }
        }
      }
    } catch {
      // ignore
    } finally {
      setIsLoaded(true);
    }
  };

  useEffect(() => {
    // Initial load from storage while DB accounts are queried
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
    }
    loadDatabaseAccounts();
  }, []);

  const switchUser = async (role: Role, vendorId?: string) => {
    let targetEmail = 'maria.oliveira@email.com';
    if (role === 'ADMIN') {
      targetEmail = 'admin@feirae.com';
    } else if (role === 'VENDOR') {
      if (vendorId) {
        const matchedVendor = availableVendors.find(v => v.id === vendorId || v.slug === vendorId || v.userId === vendorId);
        if (matchedVendor) {
          const matchedUser = availableUsers.find(u => u.id === matchedVendor.userId);
          if (matchedUser?.email) {
            targetEmail = matchedUser.email;
          }
        } else if (vendorId === 'vendor-2') {
          targetEmail = 'neusa.doces@feirae.com';
        } else if (vendorId === 'vendor-3') {
          targetEmail = 'antonio.queijos@feirae.com';
        } else {
          targetEmail = 'ze.organicos@feirae.com';
        }
      } else {
        const firstVendor = availableVendors[0];
        if (firstVendor) {
          const matchedUser = availableUsers.find(u => u.id === firstVendor.userId);
          if (matchedUser?.email) {
            targetEmail = matchedUser.email;
          }
        } else {
          targetEmail = 'ze.organicos@feirae.com';
        }
      }
    }

    const result = await loginWithEmail(targetEmail);
    if (!result.success) {
      console.warn('Switch user warning:', result.error);
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
      console.error('API auth error:', err);
      return { success: false, error: 'Erro de conexão ao autenticar.' };
    }
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
        loadDatabaseAccounts();
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
      availableUsers,
      availableVendors,
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
