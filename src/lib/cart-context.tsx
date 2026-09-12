'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { CartItem, Product } from '@/types';
import { useUser } from './user-context';

function cartKeyFor(userId?: string | null) {
  return `feirae_cart_${userId || 'guest'}`;
}

interface CartContextType {
  items: CartItem[];
  vendorId: string | null;
  vendorName: string | null;
  addItem: (product: Product, quantity?: number) => { success: boolean; message?: string };
  setItemQuantity: (product: Product, quantity: number) => { success: boolean; message?: string };
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalAmount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, isLoaded: userLoaded } = useUser();
  const [items, setItems] = useState<CartItem[]>([]);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [vendorName, setVendorName] = useState<string | null>(null);
  const activeCartKey = useRef<string | null>(null);

  // Load the cart belonging to the active user whenever login/logout/switch happens
  useEffect(() => {
    if (!userLoaded) return;
    const key = cartKeyFor(currentUser?.id);
    activeCartKey.current = key;
    try {
      const saved = localStorage.getItem(key);
      const parsed = saved ? JSON.parse(saved) : null;
      setItems(parsed?.items || []);
      setVendorId(parsed?.vendorId || null);
      setVendorName(parsed?.vendorName || null);
    } catch {
      setItems([]);
      setVendorId(null);
      setVendorName(null);
    }
  }, [userLoaded, currentUser?.id]);

  // Save cart to the active user's own localStorage slot on changes
  useEffect(() => {
    if (!userLoaded || !activeCartKey.current) return;
    try {
      localStorage.setItem(activeCartKey.current, JSON.stringify({ items, vendorId, vendorName }));
    } catch {
      // ignore
    }
  }, [items, vendorId, vendorName, userLoaded]);

  const addItem = (product: Product, quantity: number = 1): { success: boolean; message?: string } => {
    // If cart contains items from a different vendor, prompt or reset
    if (vendorId && vendorId !== product.vendorId && items.length > 0) {
      return {
        success: false,
        message: 'Seu carrinho já contém produtos de outro feirante. Finalize ou esvazie o carrinho atual para comprar desta barraca.'
      };
    }

    const currentQty = items.find(i => i.product.id === product.id)?.quantity || 0;
    const cleanQty = Number(quantity.toFixed(3));
    if (Number((currentQty + cleanQty).toFixed(3)) > product.stock) {
      return {
        success: false,
        message: `Estoque máximo disponível atingido (${product.stock} ${product.unit}).`
      };
    }

    setVendorId(product.vendorId);
    setVendorName(product.vendorName || 'Feirante');

    setItems(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i => 
          i.product.id === product.id 
            ? { ...i, quantity: Number((i.quantity + cleanQty).toFixed(3)) }
            : i
        );
      }
      return [...prev, { product, quantity: cleanQty }];
    });

    return { success: true };
  };

  const setItemQuantity = (product: Product, quantity: number): { success: boolean; message?: string } => {
    if (vendorId && vendorId !== product.vendorId && items.length > 0) {
      return {
        success: false,
        message: 'Seu carrinho já contém produtos de outro feirante. Finalize ou esvazie o carrinho atual para comprar desta barraca.'
      };
    }

    const cleanQty = Number(quantity.toFixed(3));
    if (cleanQty <= 0.001) {
      removeItem(product.id);
      return { success: true };
    }

    if (cleanQty > product.stock) {
      return {
        success: false,
        message: `Estoque máximo disponível atingido (${product.stock} ${product.unit}).`
      };
    }

    setVendorId(product.vendorId);
    setVendorName(product.vendorName || 'Feirante');

    setItems(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i => 
          i.product.id === product.id 
            ? { ...i, quantity: cleanQty }
            : i
        );
      }
      return [...prev, { product, quantity: cleanQty }];
    });

    return { success: true };
  };

  const removeItem = (productId: string) => {
    setItems(prev => {
      const updated = prev.filter(i => i.product.id !== productId);
      if (updated.length === 0) {
        setVendorId(null);
        setVendorName(null);
      }
      return updated;
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    const cleanQty = Number(quantity.toFixed(3));
    if (cleanQty <= 0.001) {
      removeItem(productId);
      return;
    }
    setItems(prev => prev.map(i => {
      if (i.product.id === productId) {
        const validQty = Number(Math.min(cleanQty, i.product.stock).toFixed(3));
        return { ...i, quantity: validQty };
      }
      return i;
    }));
  };

  const clearCart = () => {
    setItems([]);
    setVendorId(null);
    setVendorName(null);
  };

  const totalItems = items.reduce((sum, i) => sum + (i.product.isWeighable ? 1 : i.quantity), 0);
  const totalAmount = Number(items.reduce((sum, i) => sum + (i.product.price * i.quantity), 0).toFixed(2));

  return (
    <CartContext.Provider value={{
      items,
      vendorId,
      vendorName,
      addItem,
      setItemQuantity,
      removeItem,
      updateQuantity,
      clearCart,
      totalItems,
      totalAmount,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
}
