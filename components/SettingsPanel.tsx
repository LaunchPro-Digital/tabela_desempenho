import React, { useState } from 'react';
import { QuarterInfo } from '../types';
import { formatDateBR, calculateTotalWeeks } from '../services/quarterUtils';

interface SettingsPanelProps {
  quarterInfo: QuarterInfo;
  onSaveQuarterConfig: (startDate: string, endDate: string) => Promise<void>;
  onClose: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  quarterInfo,
  onSaveQuarterConfig,
  onClose,
}) => {
  const [startDate, setStartDate] = useState(quarterInfo.startDate);
  const [endDate, setEndDate] = useState(quarterInfo.endDate);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const previewWeeks = startDate && endDate ? calculateTotalWeeks(startDate, endDate) : 0;
  const isValid = startDate && endDate && new Date(endDate) > new Date(startDate) && previewWeeks > 0;

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    try {
      await onSaveQuarterConfig(startDate, endDate);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Erro ao salvar configuração:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-brand-darkCard rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-brand-darkBorder">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-brand-darkBorder">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-purple/10 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-brand-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-brand-black dark:text-white">Configurações</h2>
              <p className="text-xs text-brand-grey dark:text-slate-400">Período do trimestre</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
          >
            <svg className="w-5 h-5 text-brand-grey" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Quarter Date Inputs */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-brand-black dark:text-white uppercase tracking-wide">Período do Trimestre</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-brand-grey dark:text-slate-400 mb-1">Data de Início</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-brand-darkBorder bg-white dark:bg-slate-800 text-brand-black dark:text-white text-sm focus:ring-2 focus:ring-brand-purple focus:border-transparent outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-grey dark:text-slate-400 mb-1">Data de Término</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-brand-darkBorder bg-white dark:bg-slate-800 text-brand-black dark:text-white text-sm focus:ring-2 focus:ring-brand-purple focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            {/* Preview */}
            {isValid && (
              <div className="bg-brand-purple/5 dark:bg-brand-purple/10 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-brand-grey dark:text-slate-400">Total de semanas</span>
                  <span className="text-sm font-bold text-brand-purple">{previewWeeks} semanas</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-brand-grey dark:text-slate-400">Período</span>
                  <span className="text-sm font-medium text-brand-black dark:text-white">{formatDateBR(startDate)} — {formatDateBR(endDate)}</span>
                </div>
              </div>
            )}

            {startDate && endDate && !isValid && (
              <p className="text-xs text-rose-500 font-medium">A data de término deve ser posterior à data de início.</p>
            )}
          </div>

          {/* Current Status Info */}
          <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-2">
            <h4 className="text-xs font-bold text-brand-grey dark:text-slate-400 uppercase tracking-wide">Status Atual</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-brand-purple">{quarterInfo.currentWeek}</div>
                <div className="text-xs text-brand-grey dark:text-slate-400">Semana atual</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-brand-black dark:text-white">{quarterInfo.totalWeeks}</div>
                <div className="text-xs text-brand-grey dark:text-slate-400">Total semanas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-500">{quarterInfo.progressPercent}%</div>
                <div className="text-xs text-brand-grey dark:text-slate-400">Progresso</div>
              </div>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 mt-2">
              <div
                className="bg-brand-purple h-2 rounded-full transition-all duration-500"
                style={{ width: `${quarterInfo.progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-brand-darkBorder flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-brand-grey hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid || saving}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all ${
              saved
                ? 'bg-emerald-500'
                : isValid && !saving
                ? 'bg-brand-purple hover:bg-brand-purple/90'
                : 'bg-gray-300 dark:bg-slate-600 cursor-not-allowed'
            }`}
          >
            {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
