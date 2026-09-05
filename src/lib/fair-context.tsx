'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { FairLocation } from '@/types';

interface FairContextType {
  fairs: FairLocation[];
  selectedFairId: string;
  selectedFair: FairLocation | null;
  setSelectedFairId: (id: string) => void;
  isLoadingFairs: boolean;
  refreshFairs: () => Promise<void>;
}

const FairContext = createContext<FairContextType | undefined>(undefined);

export function FairProvider({ children }: { children: React.ReactNode }) {
  const [fairs, setFairs] = useState<FairLocation[]>([]);
  const [selectedFairId, setSelectedFairIdState] = useState<string>('ALL');
  const [isLoadingFairs, setIsLoadingFairs] = useState(true);

  const refreshFairs = async () => {
    try {
      const res = await fetch('/api/fairs');
      if (res.ok) {
        const data = await res.json();
        setFairs(data);
      }
    } catch (err) {
      console.error('Erro ao carregar feiras:', err);
    } finally {
      setIsLoadingFairs(false);
    }
  };

  useEffect(() => {
    refreshFairs();
    const stored = localStorage.getItem('feiralocal_selected_fair');
    if (stored) {
      setSelectedFairIdState(stored);
    }
  }, []);

  const setSelectedFairId = (id: string) => {
    setSelectedFairIdState(id);
    try {
      localStorage.setItem('feiralocal_selected_fair', id);
    } catch {
      // ignore
    }
  };

  const selectedFair = selectedFairId === 'ALL'
    ? null
    : fairs.find(f => f.id === selectedFairId || f.slug === selectedFairId) || null;

  return (
    <FairContext.Provider
      value={{
        fairs,
        selectedFairId,
        selectedFair,
        setSelectedFairId,
        isLoadingFairs,
        refreshFairs,
      }}
    >
      {children}
    </FairContext.Provider>
  );
}

export function useFair() {
  const context = useContext(FairContext);
  if (!context) {
    throw new Error('useFair must be used within a FairProvider');
  }
  return context;
}
