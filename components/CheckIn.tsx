import React, { useState } from 'react';
import { User, Metric, AppState } from '../types';
import { Save, AlertCircle, CheckCircle2, Moon, Sun } from 'lucide-react';

interface CheckInProps {
  user: User;
  currentWeek: number;
  onSave: (metricId: string, inputs: any) => void;
  appState: AppState;
  onThemeToggle?: () => void;
  isDarkMode?: boolean;
}

const CheckIn: React.FC<CheckInProps> = ({ user, currentWeek, onSave, appState, onThemeToggle, isDarkMode }) => {
  const [activeMetricIndex, setActiveMetricIndex] = useState(0);
  const [formState, setFormState] = useState<Record<string, number>>({});
  const [completed, setCompleted] = useState(false);

  // Check if already submitted for this week
  const hasSubmitted = user.metrics.every(m => {
    const userEntries = appState.entries[user.id] || [];
    return userEntries.some(e => e.week === currentWeek && e.inputs.metricId === m.id);
  });

  if (hasSubmitted && !completed) {
      // Logic handled by parent or render message
  }

  const activeMetric = user.metrics[activeMetricIndex];

  const handleInputChange = (key: string, value: string) => {
    setFormState(prev => ({
      ...prev,
      [key]: parseFloat(value) || 0
    }));
  };

  const handleNext = () => {
    // Save current metric data
    onSave(activeMetric.id, { ...formState, metricId: activeMetric.id });

    // Move to next or finish
    if (activeMetricIndex < user.metrics.length - 1) {
      setActiveMetricIndex(prev => prev + 1);
      setFormState({});
    } else {
      setCompleted(true);
    }
  };

  if (completed || hasSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-fade-in relative">
         {onThemeToggle && (
            <button 
                onClick={onThemeToggle}
                className="absolute top-6 right-6 p-2 rounded-full bg-white dark:bg-slate-800 text-brand-grey dark:text-slate-300 hover:text-brand-purple transition-all"
            >
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
        )}
        <div className="w-24 h-24 bg-brand-green/10 text-brand-green rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 size={48} />
        </div>
        <h2 className="text-3xl font-bold text-brand-black dark:text-white mb-2">Check-in Completo!</h2>
        <p className="text-brand-grey dark:text-slate-400 max-w-md font-medium">
          Obrigado por registrar seus números da <strong>Semana {currentWeek}</strong>. 
          Seus dados foram salvos com segurança.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 relative">
        {/* Toggle inside flow */}
        {onThemeToggle && (
            <button 
                onClick={onThemeToggle}
                className="absolute top-6 right-6 p-2 rounded-full bg-white dark:bg-slate-800 text-brand-grey dark:text-slate-300 hover:text-brand-purple transition-all z-10"
            >
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
        )}

      <div className="mb-10 pt-4">
        <div className="flex items-center justify-between mb-3 pr-12">
            <h2 className="text-xs font-bold text-brand-grey dark:text-slate-400 uppercase tracking-widest">
            Check-in Semanal • Semana {currentWeek}
            </h2>
            <span className="text-xs font-bold bg-brand-purple/10 text-brand-purple px-3 py-1 rounded-full">
                Meta {activeMetricIndex + 1} de {user.metrics.length}
            </span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div 
                className="h-full bg-brand-purple transition-all duration-500 ease-out"
                style={{ width: `${((activeMetricIndex) / user.metrics.length) * 100}%` }}
            />
        </div>
      </div>

      <div className="bg-white dark:bg-brand-darkCard rounded-2xl shadow-xl border border-gray-100 dark:border-brand-darkBorder p-8 md:p-10 relative overflow-hidden transition-colors">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand-purple to-brand-purpleDark"></div>
        <div className="mb-8 relative z-10">
            <h3 className="text-3xl font-bold text-brand-black dark:text-white mb-2">{activeMetric.title}</h3>
            <div className="inline-flex items-center gap-2 bg-gray-50 dark:bg-slate-800 px-3 py-1 rounded-lg">
               <span className="text-sm text-brand-grey dark:text-slate-400 font-medium">Meta Trimestral:</span>
               <span className="font-bold text-brand-black dark:text-white">{activeMetric.targetValue}{activeMetric.unit}</span>
            </div>
        </div>

        <div className="space-y-8 relative z-10">
          {activeMetric.inputs.map((input) => (
            <div key={input.key} className="space-y-2">
              <label className="block text-sm font-bold text-brand-grey dark:text-slate-400 uppercase tracking-wide">
                {input.label}
              </label>
              <input
                type="number"
                value={formState[input.key] || ''}
                onChange={(e) => handleInputChange(input.key, e.target.value)}
                className="w-full px-4 py-4 rounded-xl border border-gray-300 dark:border-brand-darkBorder bg-white dark:bg-slate-900 focus:border-brand-purple dark:focus:border-brand-purple focus:ring-4 focus:ring-brand-purple/10 transition-all text-xl font-medium text-brand-black dark:text-white outline-none"
                placeholder={input.placeholder || "0"}
                autoFocus={activeMetric.inputs.indexOf(input) === 0}
              />
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-gray-100 dark:border-brand-darkBorder flex justify-end relative z-10">
          <button
            onClick={handleNext}
            disabled={Object.keys(formState).length < activeMetric.inputs.length}
            className="flex items-center gap-2 bg-brand-purple hover:bg-brand-purpleDark disabled:bg-gray-300 disabled:dark:bg-slate-700 disabled:cursor-not-allowed text-white px-8 py-4 rounded-xl font-bold transition-all shadow-lg shadow-brand-purple/30 hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <Save size={20} />
            {activeMetricIndex === user.metrics.length - 1 ? 'Finalizar Check-in' : 'Salvar & Próxima'}
          </button>
        </div>
      </div>

      <div className="mt-6 flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400 rounded-xl text-sm border border-amber-100/50 dark:border-amber-900/30">
        <AlertCircle size={20} className="shrink-0 mt-0.5" />
        <p className="font-medium">Certifique-se de preencher os dados com precisão baseados na semana que passou. Seus dados são confidenciais até a reunião de sócios.</p>
      </div>
    </div>
  );
};

export default CheckIn;