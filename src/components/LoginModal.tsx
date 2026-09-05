'use client';

import React, { useState } from 'react';
import { 
  X, 
  LogIn, 
  UserPlus, 
  CheckCircle2, 
  Mail, 
  Lock, 
  KeyRound,
  Eye,
  EyeOff,
  UserCircle2,
  Store,
  ShieldCheck,
  Phone,
  MapPin,
  Tag,
  Loader2
} from 'lucide-react';
import { useUser } from '@/lib/user-context';
import { useRouter } from 'next/navigation';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'LOGIN' | 'REGISTER';
}

export function LoginModal({ isOpen, onClose, defaultTab = 'LOGIN' }: LoginModalProps) {
  const { loginWithEmail, registerUser, availableUsers, availableVendors } = useUser();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'LOGIN' | 'REGISTER'>(defaultTab);
  const [registerRole, setRegisterRole] = useState<'CLIENT' | 'VENDOR'>('CLIENT');

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('Hortifrúti');
  const [fairLocation, setFairLocation] = useState('Feira Livre da Praça da Matriz');
  const [boothNumber, setBoothNumber] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFillAccount = (userEmail: string) => {
    setEmail(userEmail);
    setPassword('senha123');
    setErrorMsg(null);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const result = await loginWithEmail(email, password);
      if (result.success && result.user) {
        setSuccessMsg(`Bem-vindo(a), ${result.user.name}!`);
        setTimeout(() => {
          onClose();
          setSuccessMsg(null);
          if (result.user?.role === 'VENDOR') {
            router.push('/vendedor');
          } else if (result.user?.role === 'ADMIN') {
            router.push('/admin');
          } else {
            router.push('/');
          }
        }, 600);
      } else {
        setErrorMsg(result.error || 'Credenciais inválidas. Verifique os dados informados.');
      }
    } catch {
      setErrorMsg('Erro de conexão ao autenticar.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const payload = {
        name,
        email,
        phone,
        password,
        role: registerRole,
        businessName,
        category,
        fairLocation,
        boothNumber,
      };

      const result = await registerUser(payload);
      if (result.success && result.user) {
        setSuccessMsg(`Conta criada com sucesso! Conectado como ${result.user.name}.`);
        setTimeout(() => {
          onClose();
          setSuccessMsg(null);
          if (registerRole === 'VENDOR') {
            router.push('/vendedor');
          } else {
            router.push('/');
          }
        }, 700);
      } else {
        setErrorMsg(result.error || 'Erro ao realizar cadastro.');
      }
    } catch {
      setErrorMsg('Erro de conexão ao registrar.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-stone-200 w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header Modal */}
        <div className="p-5 bg-gradient-to-r from-feira-700 via-feira-600 to-emerald-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
              {activeTab === 'LOGIN' ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">
                {activeTab === 'LOGIN' ? 'Acessar Feirae' : 'Criar Nova Conta'}
              </h3>
              <p className="text-xs text-white/80">
                {activeTab === 'LOGIN' 
                  ? 'Entre com seu e-mail cadastrado ou conta de teste' 
                  : 'Cadastre-se como cliente ou cadastre sua barraca'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 transition text-white/80 hover:text-white cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: Login vs Cadastro */}
        <div className="px-6 pt-4 pb-1 shrink-0">
          <div className="flex rounded-2xl bg-stone-100 p-1">
            <button
              type="button"
              onClick={() => { setActiveTab('LOGIN'); setErrorMsg(null); }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'LOGIN' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              Entrar na Conta
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('REGISTER'); setErrorMsg(null); }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'REGISTER' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Criar Nova Conta
            </button>
          </div>
        </div>

        {/* Feedback Messages */}
        {successMsg && (
          <div className="mx-6 mt-3 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2 text-xs font-medium animate-in zoom-in-95">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mx-6 mt-3 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-2 text-xs font-medium">
            <X className="w-4 h-4 text-red-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          
          {/* ================= TAB 1: LOGIN ================= */}
          {activeTab === 'LOGIN' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  E-mail de Acesso
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-feira-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Senha de Acesso
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Sua senha secreta"
                    className="w-full pl-10 pr-10 py-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-feira-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-feira-600 to-emerald-600 text-white font-bold text-sm shadow-md hover:from-feira-700 hover:to-emerald-700 transition flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                <span>Entrar no Sistema</span>
              </button>

              {/* Demo Accounts Helper */}
              <div className="pt-2">
                <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80 text-xs">
                  <div className="font-semibold text-stone-700 mb-2 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-feira-600" />
                    Contas de Teste Rápidas (clique para preencher):
                  </div>
                  
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => handleFillAccount('maria.oliveira@email.com')}
                      className="w-full text-left p-2 rounded-xl bg-white hover:bg-emerald-50/70 border border-stone-200/80 hover:border-emerald-300 transition flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <UserCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="font-semibold text-stone-800 text-[11px] truncate">
                          Maria Oliveira <span className="font-normal text-stone-400">(Cliente)</span>
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-400 group-hover:text-emerald-700 font-medium shrink-0">
                        Preencher →
                      </span>
                    </button>

                    {availableVendors.map(v => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          const u = availableUsers.find(user => user.id === v.userId);
                          if (u) handleFillAccount(u.email);
                        }}
                        className="w-full text-left p-2 rounded-xl bg-white hover:bg-amber-50/70 border border-stone-200/80 hover:border-amber-300 transition flex items-center justify-between group cursor-pointer"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Store className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="font-semibold text-stone-800 text-[11px] truncate">
                            {v.businessName} <span className="font-normal text-stone-400">({v.category})</span>
                          </span>
                        </div>
                        <span className="text-[10px] text-stone-400 group-hover:text-amber-700 font-medium shrink-0">
                          Preencher →
                        </span>
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => handleFillAccount('admin@feirae.com')}
                      className="w-full text-left p-2 rounded-xl bg-white hover:bg-purple-50/70 border border-stone-200/80 hover:border-purple-300 transition flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <ShieldCheck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span className="font-semibold text-stone-800 text-[11px] truncate">
                          Administrador <span className="font-normal text-stone-400">(Gestão)</span>
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-400 group-hover:text-purple-700 font-medium shrink-0">
                        Preencher →
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* ================= TAB 2: REGISTRATION ================= */}
          {activeTab === 'REGISTER' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              
              {/* Role Selection */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Tipo de Conta
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRegisterRole('CLIENT')}
                    className={`p-3 rounded-2xl border text-left transition flex items-center gap-2.5 cursor-pointer ${
                      registerRole === 'CLIENT'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold ring-1 ring-emerald-400/30'
                        : 'border-stone-200 hover:border-stone-300 bg-stone-50/50 text-stone-700'
                    }`}
                  >
                    <UserCircle2 className="w-5 h-5 text-emerald-600" />
                    <div>
                      <div className="text-xs">Sou Consumidor</div>
                      <div className="text-[10px] text-stone-500 font-normal">Quero fazer pré-pedidos</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRegisterRole('VENDOR')}
                    className={`p-3 rounded-2xl border text-left transition flex items-center gap-2.5 cursor-pointer ${
                      registerRole === 'VENDOR'
                        ? 'border-amber-500 bg-amber-50 text-amber-950 font-bold ring-1 ring-amber-400/30'
                        : 'border-stone-200 hover:border-stone-300 bg-stone-50/50 text-stone-700'
                    }`}
                  >
                    <Store className="w-5 h-5 text-amber-600" />
                    <div>
                      <div className="text-xs">Sou Feirante</div>
                      <div className="text-[10px] text-stone-500 font-normal">Quero vender produtos</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Personal Info */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    {registerRole === 'VENDOR' ? 'Nome do Responsável' : 'Nome Completo'}
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: João da Silva"
                    className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-feira-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      E-mail
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="joao@email.com"
                      className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-feira-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      WhatsApp / Celular
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(11) 98765-4321"
                      className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-feira-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Crie uma Senha
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-feira-500"
                  />
                </div>
              </div>

              {/* Vendor Specific Info */}
              {registerRole === 'VENDOR' && (
                <div className="p-3.5 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-3">
                  <div className="font-bold text-xs text-amber-900 flex items-center gap-1.5">
                    <Store className="w-4 h-4 text-amber-700" />
                    Dados da sua Barraca na Feira:
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                      Nome da Barraca / Marca
                    </label>
                    <input
                      type="text"
                      required
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="Ex: Horta do Vale Orgânicos"
                      className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                        Categoria
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="Hortifrúti">Hortifrúti</option>
                        <option value="Queijos & Laticínios">Queijos & Laticínios</option>
                        <option value="Doces & Panificação">Doces & Panificação</option>
                        <option value="Grãos & Cereais">Grãos & Cereais</option>
                        <option value="Pastéis & Salgados">Pastéis & Salgados</option>
                        <option value="Temperos & Ervas">Temperos & Ervas</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                        Nº do Ponto (opcional)
                      </label>
                      <input
                        type="text"
                        value={boothNumber}
                        onChange={(e) => setBoothNumber(e.target.value)}
                        placeholder="Ex: B-24"
                        className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                      Local da Feira Livre
                    </label>
                    <input
                      type="text"
                      required
                      value={fairLocation}
                      onChange={(e) => setFairLocation(e.target.value)}
                      placeholder="Ex: Praça da Matriz - Barraca 12"
                      className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-feira-600 to-emerald-600 text-white font-bold text-sm shadow-md hover:from-feira-700 hover:to-emerald-700 transition flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                <span>{registerRole === 'VENDOR' ? 'Cadastrar e Abrir Barraca' : 'Concluir Cadastro'}</span>
              </button>
            </form>
          )}

        </div>

        {/* Footer */}
        <div className="p-3.5 bg-stone-50 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500 shrink-0">
          <span>Feirae • Conectando feirantes e clientes</span>
          <button
            type="button"
            onClick={onClose}
            className="font-semibold text-stone-700 hover:text-stone-900 cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
}
