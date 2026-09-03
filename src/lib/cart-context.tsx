'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Product } from '@/types';

interface CartContextType {
  items: CartItem[];
  vendorId: string | null;
  vendorName: string | null;
  addItem: (product: Product, quantity?: number) => { success: boolean; message?: string };
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalAmount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [vendorName, setVendorName] = useState<string | null>(null);

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('feiralocal_cart');
      if (saved) {
        const parsed = JSON.parse(saved);
        setItems(parsed.items || []);
        setVendorId(parsed.vendorId || null);
        setVendorName(parsed.vendorName || null);
      }
    } catch {
      // ignore
    }
  }, []);

  // Save cart to localStorage on changes
  useEffect(() => {
    try {
      localStorage.setItem('feiralocal_cart', JSON.stringify({ items, vendorId, vendorName }));
    } catch {
      // ignore
    }
  }, [items, vendorId, vendorName]);

  const addItem = (product: Product, quantity: number = 1): { success: boolean; message?: string } => {
    // If cart contains items from a different vendor, prompt or reset
    if (vendorId && vendorId !== product.vendorId && items.length > 0) {
      return {
        success: false,
        message: 'Seu carrinho já contém produtos de outro feirante. Finalize ou esvazie o carrinho atual para comprar desta barraca.'
      };
    }

    const currentQty = items.find(i => i.product.id === product.id)?.quantity || 0;
    if (currentQty + quantity > product.stock) {
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
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [...prev, { product, quantity }];
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
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems(prev => prev.map(i => {
      if (i.product.id === productId) {
        const validQty = Math.min(quantity, i.product.stock);
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

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalAmount = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{
      items,
      vendorId,
      vendorName,
      addItem,
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
