import React, { useState } from 'react';
import { User } from '../types';
import { Lock, User as UserIcon, ArrowRight, AlertCircle, Moon, Sun, KeyRound, X, Check, Search } from 'lucide-react';

interface LoginProps {
  users: User[];
  onLogin: (user: User) => void;
  onThemeToggle: () => void;
  isDarkMode: boolean;
  onResetPassword: (userId: string, newPass: string) => void;
}

const Login: React.FC<LoginProps> = ({ users, onLogin, onThemeToggle, isDarkMode, onResetPassword }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showRecovery, setShowRecovery] = useState(false);
  
  // Recovery State
  const [recoveryUser, setRecoveryUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [recoverySearchName, setRecoverySearchName] = useState('');
  const [recoveryError, setRecoveryError] = useState('');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const foundUser = users.find(
      u => u.name.toLowerCase().includes(username.toLowerCase()) || 
           u.roleTitle.toLowerCase().includes(username.toLowerCase())
    );

    if (foundUser && foundUser.password === password) {
      onLogin(foundUser);
    } else {
      setError('Credenciais inválidas. Verifique seu nome e senha.');
    }
  };

  const handleOpenRecovery = () => {
    const found = users.find(u => u.name.toLowerCase() === username.toLowerCase());
    setRecoveryError('');
    if (found) {
        setRecoveryUser(found);
    } else {
        setRecoverySearchName(username); // Pre-fill with what they typed
        setRecoveryUser(null);
    }
    setNewPassword('');
    setShowRecovery(true);
  };

  const handleSearchUser = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');
    
    if (!recoverySearchName.trim()) {
        setRecoveryError('Por favor, digite um nome.');
        return;
    }

    const found = users.find(u => u.name.toLowerCase() === recoverySearchName.toLowerCase());
    if (found) {
        setRecoveryUser(found);
    } else {
        setRecoveryError('Usuário não encontrado. Digite um nome válido.');
    }
  };

  const handleRecoverySubmit = () => {
    if (recoveryUser && newPassword) {
        onResetPassword(recoveryUser.id, newPassword);
        setShowRecovery(false);
        setRecoveryUser(null);
        setNewPassword('');
        setRecoverySearchName('');
        setRecoveryError('');
        alert(`Senha alterada com sucesso! Agora você pode entrar como ${recoveryUser.name}.`);
    }
  };

  // Ordus Logo Component
  const OrdusLogo = () => (
    <div className="flex flex-col items-center justify-center mb-6">
       {/* Stylized Text Logo */}
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

        {/* Login Form */}
        <div className="p-8 pt-6">
            <form onSubmit={handleLoginSubmit} className="space-y-5">
                
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-brand-grey dark:text-slate-400 uppercase ml-1">Quem é você?</label>
                    <div className="relative group">
                        <UserIcon className="absolute left-3 top-3.5 text-brand-grey dark:text-slate-500 group-focus-within:text-brand-purple transition-colors" size={18} />
                        <input 
                            type="text" 
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-brand-darkBorder bg-gray-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 focus:border-brand-purple dark:focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/20 outline-none transition-all font-medium text-brand-black dark:text-white placeholder-gray-400 dark:placeholder-slate-600"
                            placeholder="Seu nome..."
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <div className="flex justify-between items-center ml-1">
                        <label className="text-xs font-bold text-brand-grey dark:text-slate-400 uppercase">Senha de Acesso</label>
                        <button 
                            type="button" 
                            onClick={handleOpenRecovery}
                            className="text-xs text-brand-purple hover:text-brand-purpleDark underline"
                        >
                            Esqueci minha senha
                        </button>
                    </div>
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
                    className="w-full bg-brand-purple hover:bg-brand-purpleDark text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-purple/30 mt-4 hover:scale-[1.02]"
                >
                    Acessar Painel <ArrowRight size={18} />
                </button>
            </form>
            
            <div className="mt-8 text-center">
                <p className="text-[10px] text-gray-400 dark:text-slate-600">
                    Ordus Performance System • v2.3
                </p>
            </div>
        </div>
      </div>

      {/* Recovery Modal */}
      {showRecovery && (
          <div className="fixed inset-0 bg-brand-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white dark:bg-brand-darkCard rounded-2xl shadow-2xl max-w-sm w-full border border-gray-100 dark:border-brand-darkBorder overflow-hidden">
                  <div className="bg-brand-purple p-4 flex items-center justify-between">
                      <h3 className="text-white font-bold flex items-center gap-2">
                          <KeyRound size={18} /> Recuperar Acesso
                      </h3>
                      <button onClick={() => setShowRecovery(false)} className="text-white/80 hover:text-white">
                          <X size={20} />
                      </button>
                  </div>
                  <div className="p-6">
                      {!recoveryUser ? (
                          <div className="space-y-4">
                              <p className="text-sm text-brand-grey dark:text-slate-300 mb-2">Informe seu nome para continuar:</p>
                              <form onSubmit={handleSearchUser} className="relative group">
                                  <UserIcon className="absolute left-3 top-3.5 text-brand-grey dark:text-slate-500 group-focus-within:text-brand-purple transition-colors" size={18} />
                                  <input 
                                      type="text" 
                                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-brand-darkBorder bg-gray-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 focus:border-brand-purple dark:focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/20 outline-none transition-all font-medium text-brand-black dark:text-white"
                                      placeholder="Seu nome..."
                                      value={recoverySearchName}
                                      onChange={(e) => {
                                          setRecoverySearchName(e.target.value);
                                          setRecoveryError('');
                                      }}
                                      autoFocus
                                  />
                                  
                                  {recoveryError && (
                                    <div className="flex items-center gap-2 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 dark:text-red-300 p-3 rounded-lg border border-red-100 dark:border-red-900/30 mt-3 animate-fade-in">
                                        <AlertCircle size={14} />
                                        {recoveryError}
                                    </div>
                                  )}

                                  <button 
                                      type="submit"
                                      className="w-full mt-3 bg-brand-black dark:bg-brand-offWhite text-white dark:text-brand-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                                  >
                                      <Search size={18} /> Buscar Usuário
                                  </button>
                              </form>
                          </div>
                      ) : (
                          <div className="space-y-4 animate-fade-in">
                              <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                                  <img src={recoveryUser.avatar} className="w-10 h-10 rounded-full" />
                                  <div>
                                      <p className="font-bold text-brand-black dark:text-white">{recoveryUser.name}</p>
                                      <p className="text-xs text-brand-grey dark:text-slate-400">Redefinindo senha...</p>
                                  </div>
                              </div>
                              
                              <div>
                                  <label className="text-xs font-bold text-brand-grey dark:text-slate-400 uppercase">Nova Senha</label>
                                  <input 
                                      type="text" 
                                      className="w-full mt-1 p-3 rounded-lg border border-gray-300 dark:border-brand-darkBorder bg-white dark:bg-slate-900 text-brand-black dark:text-white focus:border-brand-purple outline-none"
                                      placeholder="Digite a nova senha..."
                                      value={newPassword}
                                      onChange={(e) => setNewPassword(e.target.value)}
                                      autoFocus
                                  />
                              </div>

                              <button 
                                  onClick={handleRecoverySubmit}
                                  disabled={!newPassword}
                                  className="w-full bg-brand-green hover:bg-brand-greenDark disabled:bg-gray-300 disabled:dark:bg-slate-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 mt-2"
                              >
                                  <Check size={18} /> Salvar Nova Senha
                              </button>
                              <button 
                                  onClick={() => setRecoveryUser(null)}
                                  className="w-full text-brand-grey dark:text-slate-400 text-xs hover:text-brand-black dark:hover:text-white py-2"
                              >
                                  Voltar
                              </button>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Login;