'use client';

import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, Package, AlertCircle } from 'lucide-react';
import { useUser } from '@/lib/user-context';
import { Notification } from '@/types';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

export function NotificationBell() {
  const { currentUser } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifs = async () => {
    if (!currentUser?.id) return;
    try {
      const res = await fetch(`/api/notifications?userId=${currentUser?.id || ''}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!currentUser?.id) return;
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 10000);
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  const markAllRead = async () => {
    if (!currentUser?.id) return;
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser?.id }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch {
      // ignore
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-stone-600 hover:text-stone-900 rounded-full hover:bg-stone-100 transition"
        title="Notificações"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-emerald-600 rounded-full animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-stone-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-feira-600" />
                <h3 className="text-sm font-semibold text-stone-900">Notificações</h3>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-feira-700 hover:text-feira-900 font-medium flex items-center gap-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Marcar lidas
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-stone-100">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-stone-500 text-sm">
                  Nenhuma notificação por enquanto.
                </div>
              ) : (
                notifications.map(notif => (
                  <div
                    key={notif.id}
                    className={`p-3.5 text-left text-xs transition ${
                      notif.read ? 'bg-white text-stone-600' : 'bg-emerald-50/50 text-stone-900 font-medium'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 p-1.5 rounded-lg bg-feira-100 text-feira-800 shrink-0">
                        {notif.type === 'ORDER_CANCELLED' ? (
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                        ) : (
                          <Package className="w-3.5 h-3.5 text-feira-700" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-stone-900">{notif.title}</div>
                        <p className="mt-0.5 text-stone-600 leading-relaxed">{notif.message}</p>
                        <div className="mt-1.5 flex items-center justify-between text-[10px] text-stone-400">
                          <span>{formatDate(notif.createdAt)}</span>
                          {notif.orderId && (
                            <Link
                              href="/pedidos"
                              onClick={() => setIsOpen(false)}
                              className="text-feira-700 hover:underline font-semibold"
                            >
                              Ver pedido →
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
