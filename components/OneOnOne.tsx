import React, { useState, useEffect } from 'react';
import { User, AppState, Feedback, UserRole } from '../types';
import { calculateMetricStatus, getStatusColor } from '../services/calculator';
import { CheckSquare, MessageSquare, History, ChevronLeft, Save, Check, Clock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface OneOnOneProps {
  user: User;
  appState: AppState;
  onSaveFeedback: (feedback: Feedback) => void;
  onClose: () => void;
  currentUser?: User; // Pass current user to check permissions if needed
}

const OneOnOne: React.FC<OneOnOneProps> = ({ user, appState, onSaveFeedback, onClose, currentUser }) => {
  const [feedback, setFeedback] = useState<Partial<Feedback>>({
    week: appState.currentWeek,
    blockers: '',
    learning: '',
    commitment: ''
  });
  const [lastSavedMessage, setLastSavedMessage] = useState<string | null>(null);

  // Load existing feedback if present
  useEffect(() => {
    const existing = appState.feedback[user.id]?.find(f => f.week === appState.currentWeek);
    if (existing) {
        setFeedback(existing);
        if (existing.timestamp) {
            setLastSavedMessage(existing.timestamp);
        }
    }
  }, [user.id, appState.currentWeek, appState.feedback]);

  const userEntries = appState.entries[user.id] || [];
  const previousFeedback = appState.feedback[user.id] || [];
  
  // Find last week's commitment
  const lastCommitment = previousFeedback.find(f => f.week === appState.currentWeek - 1);

  const handleFeedbackSubmit = () => {
     const now = new Date();
     const options: Intl.DateTimeFormatOptions = { 
        weekday: 'long', 
        year: '2-digit', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit' 
     };
     // Format: "Segunda-feira, 09/02/26 14:27" -> Adjusting to "Segunda-feira 09/02/26 14h27" style
     let formatted = now.toLocaleDateString('pt-BR', options);
     formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1); // Capitalize first letter
     formatted = formatted.replace(',', '').replace(':', 'h');
     
     const timestampStr = `Alinhamento Registrado | ${formatted}`;

     onSaveFeedback({
        week: appState.currentWeek,
        blockers: feedback.blockers,
        commitment: feedback.commitment,
        learning: feedback.learning,
        commitmentCompleted: false, // Logic to toggle this could be added
        timestamp: timestampStr
    });
    setLastSavedMessage(timestampStr);
  };

  // Prepare chart data for first metric (Primary KPI)
  const primaryMetric = user.metrics[0];
  const chartData = userEntries
    .filter(e => e.inputs.metricId === primaryMetric.id)
    .sort((a, b) => a.week - b.week)
    .map(e => {
        let val = 0;
        const inputs = Object.values(e.inputs).filter(v => typeof v === 'number');
        if (inputs.length > 0) val = inputs[0] as number; 
        return { name: `S${e.week}`, value: val };
    });

  const currentStats = calculateMetricStatus(primaryMetric, userEntries);
  const isPartner = currentUser?.role === UserRole.PARTNER;

  return (
    <div className="bg-brand-offWhite dark:bg-brand-darkBg min-h-screen pb-20 transition-colors duration-300">
      {/* Header */}
      <div className="bg-white dark:bg-brand-darkCard sticky top-0 z-10 px-6 py-4 flex items-center justify-between shadow-sm border-b border-gray-100 dark:border-brand-darkBorder transition-colors">
        <div className="flex items-center gap-4">
            <button onClick={onClose} className="text-brand-grey dark:text-slate-400 hover:text-brand-black dark:hover:text-white font-medium text-sm flex items-center gap-1">
                <ChevronLeft size={16} /> Voltar
            </button>
            <div className="h-8 w-px bg-gray-200 dark:bg-brand-darkBorder"></div>
            <div className="flex items-center gap-3">
                <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full border border-gray-200 dark:border-slate-600" />
                <div>
                    <h1 className="text-lg font-bold text-brand-black dark:text-white leading-tight">Painel Individual: {user.name}</h1>
                    <p className="text-xs text-brand-grey dark:text-slate-400 uppercase tracking-wide">{user.roleTitle}</p>
                </div>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <div className={`px-4 py-1.5 rounded-full text-white text-sm font-bold shadow-sm ${getStatusColor(currentStats.status)}`}>
                Farol Principal: {primaryMetric.targetValue}{primaryMetric.unit}
            </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-8 animate-fade-in">
        
        {/* SECTION 1: METRICS & CHART */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             {/* Left: Metric Cards */}
             <div className="space-y-4">
                {user.metrics.map(metric => {
                    const stats = calculateMetricStatus(metric, userEntries);
                    return (
                        <div key={metric.id} className="bg-white dark:bg-brand-darkCard border border-gray-200 dark:border-brand-darkBorder rounded-xl p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-1 h-full bg-brand-purple opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="flex justify-between items-start mb-4">
                                <h4 className="font-bold text-brand-grey dark:text-slate-400 text-sm uppercase tracking-wider h-10 line-clamp-2">{metric.title}</h4>
                                <span className={`w-3 h-3 rounded-full ${getStatusColor(stats.status)} shadow-sm`}></span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-bold text-brand-black dark:text-white">{stats.value.toFixed(1)}</span>
                                <span className="text-brand-grey dark:text-slate-500 font-medium">{metric.unit}</span>
                            </div>
                            <div className="mt-3 text-xs text-gray-400 bg-gray-50 dark:bg-slate-800 dark:text-slate-500 inline-block px-2 py-1 rounded">
                                Meta Trimestral: {metric.targetValue}{metric.unit}
                            </div>
                        </div>
                    )
                })}
             </div>

             {/* Right: Chart (Span 2) */}
             <div className="lg:col-span-2 bg-white dark:bg-brand-darkCard border border-gray-200 dark:border-brand-darkBorder rounded-xl p-6 shadow-sm flex flex-col transition-colors">
                <h3 className="text-sm font-bold text-brand-grey dark:text-slate-400 uppercase tracking-wide mb-6">Evolução no Trimestre ({primaryMetric.title})</h3>
                <div className="flex-1 min-h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                            <Tooltip 
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: '#1e293b', color: '#fff' }} 
                                cursor={{stroke: '#9A11E9', strokeWidth: 1, strokeDasharray: '4 4'}}
                            />
                            <Line 
                                type="monotone" 
                                dataKey="value" 
                                stroke="#9A11E9" 
                                strokeWidth={3} 
                                dot={{r: 4, strokeWidth: 2, fill: '#fff', stroke: '#9A11E9'}} 
                                activeDot={{r: 7, fill: '#9A11E9'}} 
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
             </div>
        </div>

        {/* SECTION 2: FEEDBACK & NOTES (Full Width for writing space) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Previous Commitment Check */}
            <div className="lg:col-span-1">
                 <div className="bg-white dark:bg-brand-darkCard border border-gray-200 dark:border-brand-darkBorder rounded-xl p-6 shadow-sm h-full transition-colors">
                    <h3 className="text-sm font-bold text-brand-grey dark:text-slate-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                        <History size={16} /> Compromisso Anterior
                    </h3>
                    {lastCommitment ? (
                        <div className="bg-brand-offWhite dark:bg-slate-800 p-4 rounded-lg border border-gray-100 dark:border-slate-700">
                            <div className="flex items-start gap-3">
                                <input type="checkbox" className="mt-1 w-5 h-5 accent-brand-green rounded cursor-pointer" />
                                <div>
                                    <p className="text-brand-black dark:text-white font-medium leading-snug">{lastCommitment.commitment}</p>
                                    <p className="text-xs text-gray-500 dark:text-slate-500 mt-2 flex items-center gap-1">
                                        Semana {appState.currentWeek - 1}
                                        {lastCommitment.timestamp && (
                                           <span title={lastCommitment.timestamp}>• {lastCommitment.timestamp.split('|')[1]}</span> 
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 italic">Nenhum compromisso registrado na semana anterior.</p>
                    )}
                </div>
            </div>

            {/* Current Week Feedback Form */}
            <div className="lg:col-span-2 bg-white dark:bg-brand-darkCard border border-gray-200 dark:border-brand-darkBorder rounded-xl p-6 shadow-sm relative overflow-hidden transition-colors">
                <div className="absolute top-0 left-0 w-full h-1 bg-brand-green"></div>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-brand-black dark:text-white flex items-center gap-2">
                        <MessageSquare size={20} className="text-brand-purple" />
                        Alinhamento da Semana {appState.currentWeek}
                    </h3>
                    {isPartner && <span className="text-[10px] font-bold bg-brand-purple/10 text-brand-purple px-2 py-1 rounded border border-brand-purple/20">MODO EDIÇÃO</span>}
                </div>

                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-brand-grey dark:text-slate-400 uppercase tracking-wider mb-2">
                                Bloqueios / Dificuldades
                            </label>
                            <textarea 
                                className="w-full bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-800 focus:border-brand-purple rounded-lg p-3 text-sm text-brand-black dark:text-white focus:ring-2 focus:ring-brand-purple/10 outline-none resize-none transition-all"
                                rows={4}
                                placeholder="O que impediu um resultado melhor?"
                                value={feedback.blockers}
                                onChange={(e) => setFeedback(prev => ({...prev, blockers: e.target.value}))}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-brand-grey dark:text-slate-400 uppercase tracking-wider mb-2">
                                Principal Aprendizado
                            </label>
                            <textarea 
                                className="w-full bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-800 focus:border-brand-purple rounded-lg p-3 text-sm text-brand-black dark:text-white focus:ring-2 focus:ring-brand-purple/10 outline-none resize-none transition-all"
                                rows={4}
                                placeholder="Qual foi a maior lição da semana?"
                                value={feedback.learning}
                                onChange={(e) => setFeedback(prev => ({...prev, learning: e.target.value}))}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-brand-greenDark dark:text-brand-green uppercase tracking-wider mb-2">
                            Compromisso para Próxima Semana
                        </label>
                        <div className="relative">
                            <textarea 
                                className="w-full bg-brand-green/5 dark:bg-brand-green/10 border-brand-green/20 focus:bg-white dark:focus:bg-slate-800 focus:border-brand-green rounded-lg p-4 text-sm text-brand-black dark:text-white focus:ring-2 focus:ring-brand-green/20 outline-none resize-none shadow-sm transition-all font-medium"
                                rows={3}
                                placeholder="Uma ação prática e mensurável..."
                                value={feedback.commitment}
                                onChange={(e) => setFeedback(prev => ({...prev, commitment: e.target.value}))}
                            />
                            <CheckSquare className="absolute bottom-4 right-4 text-brand-green opacity-40 pointer-events-none" size={20} />
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-end md:items-center justify-between pt-2 gap-4">
                        <div className="order-2 md:order-1">
                            {lastSavedMessage && (
                                <div className="flex items-center gap-2 text-xs font-bold text-brand-green animate-fade-in bg-brand-green/5 px-3 py-2 rounded-lg border border-brand-green/10">
                                    <Check size={14} />
                                    {lastSavedMessage}
                                </div>
                            )}
                        </div>
                        <button 
                            onClick={handleFeedbackSubmit}
                            className="order-1 md:order-2 bg-brand-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-brand-black font-bold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 transform hover:-translate-y-0.5"
                        >
                            <Save size={18} /> Salvar Alinhamento
                        </button>
                    </div>
                </div>
            </div>

        </div>

      </div>
    </div>
  );
};

export default OneOnOne;