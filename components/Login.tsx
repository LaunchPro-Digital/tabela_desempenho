import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, AlertCircle, Moon, Sun, KeyRound } from 'lucide-react';
import { resetPasswordForEmail } from '../supabaseClient';

interface LoginProps {
  onLogin: (email: string, password: string) => Promise<{ error?: string }>;
  onThemeToggle: () => void;
  isDarkMode: boolean;
  loading?: boolean;
}

const Login: React.FC<LoginProps> = ({ onLogin, onThemeToggle, isDarkMode, loading: externalLoading }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Recovery state
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);

  const isLoading = loading || externalLoading;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Preencha todos os campos.');
      return;
    }

    setLoading(true);
    const result = await onLogin(email, password);
    if (result.error) {
      setError(result.error);
    }
    setLoading(false);
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail) return;

    setRecoveryLoading(true);
    try {
      await resetPasswordForEmail(recoveryEmail);
    } catch {
      // Silently ignore — always show neutral message for security
    } finally {
      setRecoveryLoading(false);
      setRecoverySent(true);
    }
  };

  // Ordus Logo Component
  const OrdusLogo = () => (
    <div className="flex flex-col items-center justify-center mb-6">
       <h1 className="text-4xl font-extrabold tracking-tighter text-brand-black dark:text-white mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>
          ORDUS
       </h1>
       <div className="flex items-center gap-2">
          <div className="h-0.5 w-8 bg-brand-purple"></div>
          <span className="text-[10px] font-bold text-brand-grey dark:text-slate-400 tracking-[0.3em] uppercase">Performance</span>
          <div className="h-0.5 w-8 bg-brand-green"></div>
       </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-brand-pattern relative transition-colors duration-300">

      {/* Decorative Brand Bar */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand-purple to-brand-green"></div>

      {/* Theme Toggle */}
      <button
        onClick={onThemeToggle}
        className="absolute top-6 right-6 p-2 rounded-full bg-white dark:bg-brand-darkCard shadow-md text-brand-grey dark:text-brand-offWhite hover:text-brand-purple transition-all"
        title="Alternar Tema"
      >
        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <div className="bg-white dark:bg-brand-darkCard rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in border border-gray-100 dark:border-brand-darkBorder transition-colors duration-300">

        {/* Header / Logo Area */}
        <div className="bg-white dark:bg-brand-darkCard p-8 pb-6 text-center border-b border-gray-50 dark:border-brand-darkBorder">
            <OrdusLogo />
            <h2 className="text-xl font-bold text-brand-black dark:text-white mt-4">Tabela de Desempenho</h2>
            <p className="text-xs text-brand-grey dark:text-slate-400 font-medium mt-1 uppercase tracking-wider">Alinhamento Semanal & Performance Trimestral</p>
        </div>

        <div className="p-8 pt-6">
          {!showRecovery ? (
            /* Login Form */
            <form onSubmit={handleLoginSubmit} className="space-y-5">

                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-brand-grey dark:text-slate-400 uppercase ml-1">E-mail</label>
                    <div className="relative group">
                        <Mail className="absolute left-3 top-3.5 text-brand-grey dark:text-slate-500 group-focus-within:text-brand-purple transition-colors" size={18} />
                        <input
                            type="email"
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-brand-darkBorder bg-gray-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 focus:border-brand-purple dark:focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/20 outline-none transition-all font-medium text-brand-black dark:text-white placeholder-gray-400 dark:placeholder-slate-600"
                            placeholder="seu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-brand-grey dark:text-slate-400 uppercase ml-1">Senha de Acesso</label>
                    <div className="relative group">
                        <Lock className="absolute left-3 top-3.5 text-brand-grey dark:text-slate-500 group-focus-within:text-brand-purple transition-colors" size={18} />
                        <input
                            type="password"
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-brand-darkBorder bg-gray-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 focus:border-brand-purple dark:focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/20 outline-none transition-all font-medium text-brand-black dark:text-white placeholder-gray-400 dark:placeholder-slate-600"
                            placeholder="••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-2 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 dark:text-red-300 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
                        <AlertCircle size={14} />
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-brand-purple hover:bg-brand-purpleDark disabled:bg-gray-300 disabled:dark:bg-slate-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-purple/30 mt-4 hover:scale-[1.02]"
                >
                    {isLoading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <>Acessar Painel <ArrowRight size={18} /></>
                    )}
                </button>

                <div className="text-center">
                    <button
                        type="button"
                        onClick={() => { setShowRecovery(true); setRecoveryEmail(email); }}
                        className="text-xs text-brand-grey dark:text-slate-400 hover:text-brand-purple dark:hover:text-brand-purple transition-colors underline underline-offset-2"
                    >
                        Esqueci minha senha
                    </button>
                </div>
            </form>
          ) : (
            /* Recovery Form */
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-brand-purple/10 rounded-full flex items-center justify-center">
                  <KeyRound size={18} className="text-brand-purple" />
                </div>
                <div>
                  <h3 className="font-bold text-brand-black dark:text-white text-sm">Recuperar Senha</h3>
                  <p className="text-xs text-brand-grey dark:text-slate-400">Informe seu e-mail cadastrado</p>
                </div>
              </div>

              {recoverySent ? (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30 rounded-xl p-4 text-center">
                  <p className="text-sm font-medium text-green-700 dark:text-green-300">
                    Se o e-mail estiver cadastrado, você receberá um link de recuperação em breve.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleRecoverySubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-brand-grey dark:text-slate-400 uppercase ml-1">E-mail</label>
                    <div className="relative group">
                      <Mail className="absolute left-3 top-3.5 text-brand-grey dark:text-slate-500 group-focus-within:text-brand-purple transition-colors" size={18} />
                      <input
                        type="email"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-brand-darkBorder bg-gray-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 focus:border-brand-purple dark:focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/20 outline-none transition-all font-medium text-brand-black dark:text-white placeholder-gray-400 dark:placeholder-slate-600"
                        placeholder="seu@email.com"
                        value={recoveryEmail}
                        onChange={(e) => setRecoveryEmail(e.target.value)}
                        autoFocus
                        required
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={recoveryLoading}
                    className="w-full bg-brand-purple hover:bg-brand-purpleDark disabled:bg-gray-300 disabled:dark:bg-slate-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
                  >
                    {recoveryLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      'Enviar link de recuperação'
                    )}
                  </button>
                </form>
              )}

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setShowRecovery(false); setRecoverySent(false); }}
                  className="text-xs text-brand-grey dark:text-slate-400 hover:text-brand-purple dark:hover:text-brand-purple transition-colors underline underline-offset-2"
                >
                  Voltar ao login
                </button>
              </div>

              {!recoverySent && (
                <p className="text-[10px] text-center text-brand-grey dark:text-slate-500">
                  Se o SMTP não estiver configurado, solicite ao administrador o reset da sua senha.
                </p>
              )}
            </div>
          )}

          <div className="mt-6 text-center">
              <p className="text-[10px] text-gray-400 dark:text-slate-600">
                  Ordus Performance System • v3.0
              </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(Login);
