import React, { useState } from 'react';
import { X, Lock, CheckCircle } from 'lucide-react';

interface ChangePasswordModalProps {
  onClose: () => void;
  onChangePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ onClose, onChangePassword }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    const result = await onChangePassword(newPassword);
    setLoading(false);

    if (result.success) {
      setSuccess(true);
      setTimeout(onClose, 2000);
    } else {
      setError(result.error || 'Erro ao alterar senha. Tente novamente.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-brand-darkCard rounded-2xl shadow-2xl w-full max-w-sm border border-gray-100 dark:border-brand-darkBorder animate-fade-in">

        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-brand-darkBorder">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-purple/10 rounded-full flex items-center justify-center">
              <Lock size={16} className="text-brand-purple" />
            </div>
            <h3 className="font-bold text-brand-black dark:text-white">Alterar Senha</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-brand-grey dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          {success ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle size={40} className="text-green-500" />
              <p className="font-semibold text-brand-black dark:text-white">Senha alterada com sucesso!</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-grey dark:text-slate-400 uppercase">Nova Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 text-brand-grey dark:text-slate-500" size={16} />
                  <input
                    type="password"
                    className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 dark:border-brand-darkBorder bg-gray-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 focus:border-brand-purple dark:focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/20 outline-none transition-all font-medium text-brand-black dark:text-white"
                    placeholder="••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-grey dark:text-slate-400 uppercase">Confirmar Nova Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 text-brand-grey dark:text-slate-500" size={16} />
                  <input
                    type="password"
                    className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 dark:border-brand-darkBorder bg-gray-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 focus:border-brand-purple dark:focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/20 outline-none transition-all font-medium text-brand-black dark:text-white"
                    placeholder="••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
                  {error}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-brand-darkBorder text-brand-grey dark:text-slate-400 font-bold text-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-brand-purple hover:bg-brand-purpleDark disabled:bg-gray-300 disabled:dark:bg-slate-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Salvar'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
