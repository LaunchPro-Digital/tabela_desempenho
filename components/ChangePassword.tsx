import React, { useState } from 'react';
import { User } from '../types';
import { Lock, Check, AlertCircle, ShieldCheck } from 'lucide-react';

interface ChangePasswordProps {
  user: User;
  onPasswordChanged: () => void;
  onChangePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

const ChangePassword: React.FC<ChangePasswordProps> = ({ user, onPasswordChanged, onChangePassword }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    const result = await onChangePassword(newPassword);

    if (result.success) {
      onPasswordChanged();
    } else {
      setError(result.error || 'Erro ao alterar senha. Tente novamente.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-brand-pattern relative transition-colors duration-300">
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand-purple to-brand-green"></div>

      <div className="bg-white dark:bg-brand-darkCard rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in border border-gray-100 dark:border-brand-darkBorder transition-colors duration-300">
        <div className="bg-brand-purple p-6 text-center">
          <ShieldCheck className="mx-auto mb-3 text-white" size={40} />
          <h2 className="text-xl font-bold text-white">Primeiro Acesso</h2>
          <p className="text-white/80 text-sm mt-1">Crie uma nova senha para continuar</p>
        </div>

        <div className="p-8">
          <div className="flex items-center gap-3 mb-6 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
            <img src={user.avatar} className="w-10 h-10 rounded-full" alt={user.name} />
            <div>
              <p className="font-bold text-brand-black dark:text-white">{user.name}</p>
              <p className="text-xs text-brand-grey dark:text-slate-400">{user.roleTitle}</p>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-lg p-3 mb-6">
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Por seguranca, voce precisa trocar a senha padrao antes de usar o sistema.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-brand-grey dark:text-slate-400 uppercase ml-1">Nova Senha</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-3.5 text-brand-grey dark:text-slate-500 group-focus-within:text-brand-purple transition-colors" size={18} />
                <input
                  type="password"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-brand-darkBorder bg-gray-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 focus:border-brand-purple dark:focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/20 outline-none transition-all font-medium text-brand-black dark:text-white placeholder-gray-400 dark:placeholder-slate-600"
                  placeholder="Minimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-brand-grey dark:text-slate-400 uppercase ml-1">Confirmar Senha</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-3.5 text-brand-grey dark:text-slate-500 group-focus-within:text-brand-purple transition-colors" size={18} />
                <input
                  type="password"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-brand-darkBorder bg-gray-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 focus:border-brand-purple dark:focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/20 outline-none transition-all font-medium text-brand-black dark:text-white placeholder-gray-400 dark:placeholder-slate-600"
                  placeholder="Repita a senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
              disabled={loading || !newPassword || !confirmPassword}
              className="w-full bg-brand-green hover:bg-brand-greenDark disabled:bg-gray-300 disabled:dark:bg-slate-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-green/30 mt-4"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Check size={18} /> Definir Nova Senha
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
