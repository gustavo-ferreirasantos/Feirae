'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  ShoppingBag, 
  Store, 
  UserCircle2, 
  ShieldCheck, 
  ChevronDown,
  LogIn,
  LogOut,
  ExternalLink
} from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { useUser } from '@/lib/user-context';
import { NotificationBell } from './NotificationBell';
import { LoginModal } from './LoginModal';
import { FairSelector } from './FairSelector';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { totalItems } = useCart();
  const { currentUser, currentVendor, logout, isLoaded } = useUser();
  const [profileDropdown, setProfileDropdown] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const activeRole = currentUser?.role || null;

  const handleLogout = () => {
    logout();
    setProfileDropdown(false);
    router.push('/');
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            
            {/* Logo & Fair Selector */}
            <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
              <Link href="/" className="flex items-center gap-2.5 group shrink-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-feira-600 to-feira-400 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xl font-extrabold tracking-tight text-stone-900">
                    Feira<span className="text-feira-600">Local</span>
                  </span>
                  <span className="block text-[10px] text-stone-500 font-medium -mt-0.5">
                    Conectando feirantes & vizinhança
                  </span>
                </div>
              </Link>

              <div className="hidden sm:block">
                <FairSelector />
              </div>
            </div>

            {/* Navigation Links DIVIDED BY USER ROLE OR VISITOR */}
            <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
              
              {/* ================= VISITANTE (NÃO LOGADO) ================= */}
              {!activeRole && (
                <>
                  <Link
                    href="/"
                    className={`px-3.5 py-2 rounded-xl transition ${
                      pathname === '/' 
                        ? 'text-feira-700 bg-feira-50 font-bold shadow-2xs' 
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                    }`}
                  >
                    Vitrine & Produtos
                  </Link>
                  <Link
                    href="/feirantes"
                    className={`px-3.5 py-2 rounded-xl transition ${
                      pathname.startsWith('/feirantes') 
                        ? 'text-feira-700 bg-feira-50 font-bold shadow-2xs' 
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                    }`}
                  >
                    Barracas & Feirantes
                  </Link>
                </>
              )}

              {/* ================= CLIENTE LOGADO ================= */}
              {activeRole === 'CLIENT' && (
                <>
                  <Link
                    href="/"
                    className={`px-3.5 py-2 rounded-xl transition ${
                      pathname === '/' 
                        ? 'text-feira-700 bg-feira-50 font-bold shadow-2xs' 
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                    }`}
                  >
                    Vitrine & Produtos
                  </Link>
                  <Link
                    href="/feirantes"
                    className={`px-3.5 py-2 rounded-xl transition ${
                      pathname.startsWith('/feirantes') 
                        ? 'text-feira-700 bg-feira-50 font-bold shadow-2xs' 
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                    }`}
                  >
                    Barracas & Feirantes
                  </Link>
                  <Link
                    href="/pedidos"
                    className={`px-3.5 py-2 rounded-xl transition ${
                      pathname === '/pedidos' 
                        ? 'text-feira-700 bg-feira-50 font-bold shadow-2xs' 
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                    }`}
                  >
                    Meus Pedidos
                  </Link>
                </>
              )}

              {/* ================= VENDEDOR / FEIRANTE ================= */}
              {activeRole === 'VENDOR' && (
                <>
                  <Link
                    href="/vendedor"
                    className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 ${
                      pathname === '/vendedor' 
                        ? 'text-amber-800 bg-amber-50 font-bold border border-amber-200/80 shadow-2xs' 
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                    }`}
                  >
                    <Store className="w-4 h-4 text-amber-600" />
                    Painel do Feirante
                  </Link>
                  {currentVendor && (
                    <Link
                      href={`/feirantes/${currentVendor.slug || currentVendor.id}`}
                      className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 ${
                        pathname === `/feirantes/${currentVendor.slug || currentVendor.id}`
                          ? 'text-feira-700 bg-feira-50 font-bold shadow-2xs' 
                          : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                      }`}
                    >
                      <ExternalLink className="w-4 h-4 text-stone-400" />
                      Minha Barraca na Vitrine
                    </Link>
                  )}
                  <Link
                    href="/"
                    className={`px-3.5 py-2 rounded-xl transition ${
                      pathname === '/' 
                        ? 'text-feira-700 bg-feira-50 font-bold shadow-2xs' 
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                    }`}
                  >
                    Ver Feira Completa
                  </Link>
                </>
              )}

              {/* ================= ADMINISTRADOR ================= */}
              {activeRole === 'ADMIN' && (
                <Link
                  href="/admin"
                  className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${
                    pathname === '/admin' 
                      ? 'text-purple-800 bg-purple-50 font-bold border border-purple-200/80 shadow-2xs' 
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50 font-semibold'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  Painel de Administração
                </Link>
              )}

            </nav>

            {/* Right Action Icons */}
            <div className="flex items-center gap-1.5 sm:gap-3">
              <div className="sm:hidden">
                <FairSelector />
              </div>
              
              {/* Notification Bell (for logged in users) */}
              {currentUser && <NotificationBell />}

              {/* Cart Button (Disabled for Admin & Vendor) */}
              {activeRole !== 'ADMIN' && activeRole !== 'VENDOR' && (
                <Link
                  href="/carrinho"
                  className="relative p-2 text-stone-700 hover:text-stone-900 rounded-xl hover:bg-stone-100 transition flex items-center gap-1.5"
                  title="Carrinho de Compras"
                >
                  <div className="relative">
                    <ShoppingBag className="w-5 h-5 text-feira-700" />
                    {totalItems > 0 && (
                      <span className="absolute -top-2 -right-2 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[11px] font-bold text-white bg-feira-600 rounded-full shadow-xs">
                        {totalItems}
                      </span>
                    )}
                  </div>
                  <span className="hidden sm:inline text-xs font-semibold text-stone-700">
                    Carrinho
                  </span>
                </Link>
              )}

              {/* Logged Out / Login Button vs Profile Pill */}
              {!currentUser ? (
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-feira-600 to-emerald-600 hover:from-feira-700 hover:to-emerald-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Entrar / Login</span>
                </button>
              ) : (
                <div className="relative">
                  <button
                    onClick={() => setProfileDropdown(!profileDropdown)}
                    className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-xl border border-stone-200 hover:border-stone-300 bg-stone-50/80 hover:bg-stone-100 transition text-xs font-semibold text-stone-800 cursor-pointer"
                  >
                    <div className={`w-6 h-6 rounded-full text-white flex items-center justify-center text-[10px] font-bold ${
                      activeRole === 'CLIENT' ? 'bg-emerald-600' : activeRole === 'VENDOR' ? 'bg-amber-600' : 'bg-purple-600'
                    }`}>
                      {activeRole === 'CLIENT' ? 'C' : activeRole === 'VENDOR' ? 'V' : 'A'}
                    </div>
                    <div className="text-left hidden sm:block">
                      <div className="truncate max-w-[120px] leading-tight">
                        {activeRole === 'VENDOR' ? (currentVendor?.businessName || currentUser?.name) : currentUser?.name}
                      </div>
                      <div className="text-[10px] text-stone-400 font-normal leading-none mt-0.5 capitalize">
                        {activeRole === 'CLIENT' ? 'Cliente' : activeRole === 'VENDOR' ? 'Feirante' : 'Admin'}
                      </div>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
                  </button>

                  {/* Dropdown Menu */}
                  {profileDropdown && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setProfileDropdown(false)} />
                      <div className="absolute right-0 mt-2 w-80 bg-white rounded-3xl shadow-2xl border border-stone-200 z-50 p-2 text-xs divide-y divide-stone-100 animate-in fade-in duration-150">
                        
                        {/* Active Profile Card (Exact Design Preserved) */}
                        <div className="p-1">
                          <div className={`w-full text-left p-3 rounded-2xl flex items-center justify-between transition ${
                            activeRole === 'CLIENT' 
                              ? 'bg-emerald-50/70' 
                              : activeRole === 'VENDOR' 
                              ? 'bg-amber-50/70' 
                              : 'bg-purple-50/70'
                          }`}>
                            <div className="flex items-center gap-3 truncate">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                activeRole === 'CLIENT' 
                                  ? 'bg-emerald-100/80 text-emerald-600' 
                                  : activeRole === 'VENDOR' 
                                  ? 'bg-amber-100/80 text-amber-600' 
                                  : 'bg-purple-100/80 text-purple-600'
                              }`}>
                                {activeRole === 'CLIENT' ? (
                                  <UserCircle2 className="w-5 h-5 text-emerald-600" />
                                ) : activeRole === 'VENDOR' ? (
                                  <Store className="w-5 h-5 text-amber-600" />
                                ) : (
                                  <ShieldCheck className="w-5 h-5 text-purple-600" />
                                )}
                              </div>
                              <div className="truncate">
                                <div className="font-bold text-stone-900 text-xs truncate">
                                  {activeRole === 'VENDOR' ? currentVendor?.businessName : currentUser?.name}
                                </div>
                                <div className="text-[11px] text-stone-400 font-normal truncate">
                                  {activeRole === 'CLIENT' 
                                    ? 'Cliente (Consumidor da Feira)' 
                                    : activeRole === 'VENDOR' 
                                    ? (currentVendor?.category || 'Feirante') 
                                    : 'Gestão & Relatórios'}
                                </div>
                              </div>
                            </div>

                            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200/60 shrink-0">
                              Ativo
                            </span>
                          </div>
                        </div>

                        {/* Login and Account Actions */}
                        <div className="p-1 pt-1.5 space-y-1">
                          <button
                            onClick={() => {
                              setProfileDropdown(false);
                              setIsLoginModalOpen(true);
                            }}
                            className="w-full text-left px-3 py-2 rounded-xl flex items-center justify-between hover:bg-stone-50 text-stone-700 font-semibold transition"
                          >
                            <div className="flex items-center gap-2">
                              <LogIn className="w-4 h-4 text-feira-600" />
                              <span>Fazer Login com outra Conta</span>
                            </div>
                            <span className="text-[10px] bg-feira-100 text-feira-800 px-1.5 py-0.5 rounded font-bold">
                              Trocar
                            </span>
                          </button>

                          <button
                            onClick={handleLogout}
                            className="w-full text-left px-3 py-2 rounded-xl flex items-center gap-2 hover:bg-red-50 text-red-600 font-semibold transition"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>Desconectar / Sair</span>
                          </button>
                        </div>

                      </div>
                    </>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      </header>

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </>
  );
}
