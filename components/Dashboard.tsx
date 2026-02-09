import React, { useState } from 'react';
import { User, AppState, UserRole, Metric, Feedback } from '../types';
import { calculateMetricStatus, getStatusColor, calculateWeeklyValue } from '../services/calculator';
import { Users, BarChart3, ChevronRight, PlayCircle, Settings, Edit3, Moon, Sun, MessageSquare, ExternalLink, Clock } from 'lucide-react';
import OneOnOne from './OneOnOne';
import AdminPanel from './AdminPanel';

interface DashboardProps {
  appState: AppState;
  onLogout: () => void;
  currentUser: User;
  onUpdateEntry: (userId: string, week: number, metricId: string, inputs: any) => void;
  onUpdateUsers: (users: User[]) => void;
  onSaveFeedback: (userId: string, feedback: Feedback) => void;
  onThemeToggle: () => void;
  isDarkMode: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ appState, onLogout, currentUser, onUpdateEntry, onUpdateUsers, onSaveFeedback, onThemeToggle, isDarkMode }) => {
  const [selectedUserFor1on1, setSelectedUserFor1on1] = useState<User | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [editingCell, setEditingCell] = useState<{userId: string, week: number, metric: Metric, currentInputs: any} | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  // Helper to get inputs safely
  const getEntryInputs = (userId: string, week: number, metricId: string) => {
    const entries = appState.entries[userId] || [];
    const entry = entries.find(e => e.week === week && e.inputs.metricId === metricId);
    return entry ? entry.inputs : {};
  };

  const handleCellClick = (userId: string, week: number, metric: Metric) => {
    if (currentUser.role !== UserRole.PARTNER) return;
    
    // Only allow editing up to current week
    if (week > appState.currentWeek) return;

    const currentInputs = getEntryInputs(userId, week, metric.id);
    setEditingCell({ userId, week, metric, currentInputs });
    setEditForm({ ...currentInputs });
  };

  const handleSaveEdit = () => {
    if (editingCell) {
        onUpdateEntry(editingCell.userId, editingCell.week, editingCell.metric.id, { ...editForm, metricId: editingCell.metric.id });
        setEditingCell(null);
    }
  };

  // If a user is selected for 1-on-1, render that view overlay
  if (selectedUserFor1on1) {
    return (
      <OneOnOne 
        user={selectedUserFor1on1} 
        appState={appState} 
        onSaveFeedback={(fb) => onSaveFeedback(selectedUserFor1on1.id, fb)} 
        onClose={() => setSelectedUserFor1on1(null)} 
        currentUser={currentUser}
      />
    );
  }

  if (showAdminPanel) {
      return (
          <AdminPanel 
            users={appState.users} 
            onUpdateUsers={(updatedUsers) => {
                onUpdateUsers(updatedUsers);
                if (!updatedUsers.find(u => u.id === currentUser.id)) onLogout();
            }}
            onClose={() => setShowAdminPanel(false)}
          />
      );
  }

  return (
    <div className="min-h-screen bg-brand-offWhite dark:bg-brand-darkBg relative transition-colors duration-300">
      {/* Top Navigation */}
      <nav className="bg-white dark:bg-brand-darkCard px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm border-b border-gray-100 dark:border-brand-darkBorder transition-colors">
        <div className="flex items-center gap-3">
          {/* Logo ORDUS */}
          <div className="flex flex-col">
              <span className="font-extrabold text-2xl tracking-tighter leading-none text-brand-black dark:text-white">ORDUS</span>
              <span className="text-[9px] font-bold text-brand-grey dark:text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-purple"></span> Performance
              </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
            
            <button 
                onClick={onThemeToggle}
                className="p-2 rounded-full bg-gray-50 dark:bg-slate-800 text-brand-grey dark:text-slate-300 hover:text-brand-purple dark:hover:text-brand-purple transition-all"
            >
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {currentUser.role === UserRole.PARTNER && (
                <button 
                    onClick={() => setShowAdminPanel(true)}
                    className="flex items-center gap-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-brand-grey dark:text-slate-300 hover:text-brand-black dark:hover:text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                >
                    <Settings size={16} /> Gestão do Time
                </button>
            )}
            <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-brand-black dark:text-white">{currentUser.name}</p>
                <p className="text-xs text-brand-grey dark:text-slate-400">Semana {appState.currentWeek}</p>
            </div>
            <img src={currentUser.avatar} alt="Me" className="w-10 h-10 rounded-full border-2 border-white dark:border-brand-darkBorder shadow-md" />
            <button onClick={onLogout} className="text-sm font-medium text-brand-grey dark:text-slate-400 hover:text-red-500 transition-colors ml-2">Sair</button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-[1800px] mx-auto p-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
                <h1 className="text-3xl font-bold text-brand-black dark:text-white tracking-tight">Tabela de Desempenho</h1>
                <p className="text-brand-grey dark:text-slate-400 mt-1 font-medium">Alinhamento Semanal & Performance Trimestral</p>
            </div>
            <div className="flex items-center gap-2 bg-white dark:bg-brand-darkCard p-2 rounded-lg border border-gray-100 dark:border-brand-darkBorder shadow-sm">
                <span className="flex items-center gap-2 px-3 py-1.5 bg-brand-green/10 text-brand-greenDark dark:text-brand-green rounded-md text-xs font-bold uppercase tracking-wide">
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-green"></span> Na Meta
                </span>
                <span className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 rounded-md text-xs font-bold uppercase tracking-wide">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Atenção
                </span>
                <span className="flex items-center gap-2 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 rounded-md text-xs font-bold uppercase tracking-wide">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Crítico
                </span>
            </div>
        </div>

        {/* The Table (Cockpit) */}
        <div className="bg-white dark:bg-brand-darkCard rounded-2xl shadow-xl border border-gray-100 dark:border-brand-darkBorder overflow-hidden transition-colors">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs font-bold text-brand-grey dark:text-slate-400 uppercase bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-brand-darkBorder">
                        <tr>
                            <th className="px-6 py-5 w-72 sticky left-0 bg-gray-50 dark:bg-brand-darkCard z-10">Responsável / Métrica</th>
                            <th className="px-4 py-5 text-center">Meta</th>
                            <th className="px-4 py-5 text-center">Unid.</th>
                            {/* Render Weeks 1-13 Columns */}
                            {Array.from({length: 13}, (_, i) => i + 1).map(week => (
                                <th key={week} className={`px-2 py-5 text-center w-14 ${week === appState.currentWeek ? 'bg-brand-purple/5 dark:bg-brand-purple/10 text-brand-purple border-b-2 border-brand-purple' : ''}`}>S{week}</th>
                            ))}
                            <th className="px-4 py-5 text-center w-28 sticky right-0 bg-gray-50 dark:bg-brand-darkCard z-10">Farol</th>
                            <th className="px-4 py-5 w-20"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-brand-darkBorder">
                        {appState.users.map(user => (
                            <React.Fragment key={user.id}>
                                {user.metrics.map((metric, idx) => {
                                    const userEntries = appState.entries[user.id] || [];
                                    const stats = calculateMetricStatus(metric, userEntries);
                                    
                                    return (
                                        <tr key={metric.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors group">
                                            <td className="px-6 py-4 sticky left-0 bg-white dark:bg-brand-darkCard group-hover:bg-gray-50 dark:group-hover:bg-brand-darkCard transition-colors border-r border-transparent group-hover:border-gray-100 dark:group-hover:border-brand-darkBorder">
                                                <div className="flex items-center gap-4">
                                                    <img src={user.avatar} className="w-10 h-10 rounded-full border border-gray-200 dark:border-slate-600 shadow-sm" alt={user.name} />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-bold text-brand-black dark:text-white text-base">{user.name}</div>
                                                        <div className="text-xs text-brand-grey dark:text-slate-400 truncate" title={metric.title}>{metric.title}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-center font-bold text-brand-black dark:text-white bg-gray-50/50 dark:bg-slate-800/20 border-x border-dashed border-gray-200 dark:border-brand-darkBorder">
                                                {metric.targetValue}
                                            </td>
                                            <td className="px-4 py-4 text-center text-brand-grey dark:text-slate-400 text-xs font-medium">
                                                {metric.unit}
                                            </td>
                                            
                                            {/* Weekly Data Cells */}
                                            {Array.from({length: 13}, (_, i) => i + 1).map(week => {
                                                const entry = userEntries.find(e => e.week === week && e.inputs.metricId === metric.id);
                                                let displayVal = '-';
                                                
                                                if (entry) {
                                                    // Calculate the weekly value for display (e.g., %)
                                                    const val = calculateWeeklyValue(metric, entry);
                                                    displayVal = String(Math.round(val));
                                                }

                                                const isEditable = currentUser.role === UserRole.PARTNER && week <= appState.currentWeek;

                                                return (
                                                    <td 
                                                        key={week} 
                                                        onClick={() => isEditable && handleCellClick(user.id, week, metric)}
                                                        className={`px-2 py-4 text-center text-xs text-brand-grey dark:text-slate-400 relative font-medium
                                                            ${week === appState.currentWeek ? 'bg-brand-purple/5 dark:bg-brand-purple/10' : ''}
                                                            ${isEditable ? 'cursor-pointer hover:bg-brand-purple/10 dark:hover:bg-brand-purple/20 hover:text-brand-purple' : ''}
                                                        `}
                                                    >
                                                        {displayVal}
                                                        {isEditable && displayVal !== '-' && (
                                                            <div className="hidden group-hover:block absolute top-1 right-1 w-1.5 h-1.5 bg-brand-purple rounded-full"></div>
                                                        )}
                                                    </td>
                                                );
                                            })}

                                            {/* Status / Farol */}
                                            <td className="px-4 py-4 sticky right-0 bg-white dark:bg-brand-darkCard group-hover:bg-gray-50 dark:group-hover:bg-brand-darkCard border-l border-transparent group-hover:border-gray-100 dark:group-hover:border-brand-darkBorder">
                                                <div className={`h-8 rounded-lg flex items-center justify-center font-bold text-white shadow-md ${getStatusColor(stats.status)}`}>
                                                    {stats.value.toFixed(1)}
                                                </div>
                                            </td>

                                            {/* Action */}
                                            <td className="px-4 py-4 text-right">
                                                {idx === 0 && (
                                                    <button 
                                                        onClick={() => setSelectedUserFor1on1(user)}
                                                        className="p-2 text-brand-grey dark:text-slate-500 hover:text-brand-purple dark:hover:text-brand-purple hover:bg-brand-purple/10 rounded-full transition-all"
                                                        title="Abrir 1-1"
                                                    >
                                                        <PlayCircle size={20} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
        
        {/* Latest Alignments Section */}
        <div className="mt-8">
            <h3 className="text-xl font-bold text-brand-black dark:text-white mb-6 flex items-center gap-2">
                <MessageSquare size={24} className="text-brand-purple" />
                Alinhamentos Recentes
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {appState.users.map(u => {
                    const feedbacks = appState.feedback[u.id] || [];
                    // Get latest feedback
                    const latestFeedback = [...feedbacks].sort((a, b) => b.week - a.week)[0];

                    if (!latestFeedback) return null;

                    return (
                        <div key={u.id} className="bg-white dark:bg-brand-darkCard border border-gray-100 dark:border-brand-darkBorder rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-4 border-b border-gray-50 dark:border-slate-800 pb-3">
                                <img src={u.avatar} className="w-10 h-10 rounded-full border border-gray-100 dark:border-slate-700" />
                                <div>
                                    <p className="font-bold text-brand-black dark:text-white text-sm">{u.name}</p>
                                    <div className="flex items-center gap-1.5 text-[10px] text-brand-grey dark:text-slate-500 uppercase">
                                        <span>Semana {latestFeedback.week}</span>
                                        {latestFeedback.timestamp && (
                                            <>
                                                <span>•</span>
                                                <Clock size={10} />
                                                <span className="truncate max-w-[80px]" title={latestFeedback.timestamp}>{latestFeedback.timestamp.split('|')[1]?.trim() || 'Recente'}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                {latestFeedback.blockers && (
                                    <div>
                                        <p className="text-[10px] font-bold text-red-500 uppercase tracking-wide mb-1">Bloqueios</p>
                                        <p className="text-xs text-brand-grey dark:text-slate-300 line-clamp-2">{latestFeedback.blockers}</p>
                                    </div>
                                )}
                                {latestFeedback.learning && (
                                    <div>
                                        <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wide mb-1">Aprendizado</p>
                                        <p className="text-xs text-brand-grey dark:text-slate-300 line-clamp-2">{latestFeedback.learning}</p>
                                    </div>
                                )}
                                {latestFeedback.commitment && (
                                    <div className="bg-brand-green/5 dark:bg-brand-green/10 p-2 rounded-lg mt-2">
                                        <p className="text-[10px] font-bold text-brand-green uppercase tracking-wide mb-1">Compromisso</p>
                                        <p className="text-xs text-brand-black dark:text-white font-medium line-clamp-2">{latestFeedback.commitment}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Edit Modal */}
        {editingCell && (
            <div className="fixed inset-0 bg-brand-black/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-brand-darkCard rounded-2xl shadow-2xl p-8 max-w-sm w-full animate-fade-in border border-gray-100 dark:border-brand-darkBorder">
                    <h3 className="font-bold text-xl mb-1 text-brand-black dark:text-white">Editar Semana {editingCell.week}</h3>
                    <p className="text-sm text-brand-grey dark:text-slate-400 mb-6 font-medium">{editingCell.metric.title}</p>
                    
                    <div className="space-y-4">
                        {editingCell.metric.inputs.map(inp => (
                            <div key={inp.key}>
                                <label className="block text-xs font-bold uppercase text-brand-grey dark:text-slate-400 mb-1.5">{inp.label}</label>
                                <input 
                                    type="number" 
                                    className="w-full border border-gray-300 dark:border-brand-darkBorder rounded-lg p-3 text-lg font-medium focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/20 bg-white dark:bg-slate-900 text-brand-black dark:text-white outline-none transition-all"
                                    value={editForm[inp.key] !== undefined ? editForm[inp.key] : ''}
                                    onChange={e => setEditForm({...editForm, [inp.key]: parseFloat(e.target.value)})}
                                    autoFocus={editingCell.metric.inputs.indexOf(inp) === 0}
                                />
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-3 mt-8">
                        <button 
                            onClick={() => setEditingCell(null)}
                            className="flex-1 py-3 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl font-bold text-brand-grey dark:text-slate-300 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleSaveEdit}
                            className="flex-1 py-3 bg-brand-purple hover:bg-brand-purpleDark rounded-xl font-bold text-white flex justify-center gap-2 items-center shadow-lg shadow-brand-purple/20 transition-all"
                        >
                            <Edit3 size={18} /> Salvar
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Footer Area */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-brand-darkCard p-8 rounded-2xl border border-gray-100 dark:border-brand-darkBorder shadow-lg">
                <h3 className="font-bold text-brand-black dark:text-white mb-6 flex items-center gap-2 text-lg">
                    <Users size={20} className="text-brand-purple"/> 
                    Destaques da Semana
                </h3>
                <div className="space-y-4">
                    {appState.users.slice(0, 2).map(u => (
                         <div key={u.id} className="flex items-center gap-4 pb-4 border-b border-gray-50 dark:border-slate-800 last:border-0 last:pb-0">
                            <img src={u.avatar} className="w-12 h-12 rounded-full border border-gray-100 dark:border-slate-600" />
                            <div>
                                <p className="font-bold text-brand-black dark:text-white text-lg">{u.name}</p>
                                <p className="text-xs text-brand-green font-bold uppercase tracking-wide">Todas as metas no verde</p>
                            </div>
                         </div>
                    ))}
                </div>
            </div>

            <div className="bg-brand-black dark:bg-brand-darkCard text-white p-8 rounded-2xl shadow-xl relative overflow-hidden flex flex-col justify-center border border-gray-900 dark:border-brand-darkBorder">
                <div className="relative z-10">
                    <h3 className="font-bold text-2xl mb-2">Reunião de Sócios</h3>
                    <p className="text-gray-400 text-sm mb-8">Segunda-feira, 16h</p>
                    <a 
                        href="https://meet.google.com/tpw-tjcv-akk" 
                        target="_blank" 
                        rel="noreferrer"
                        className="bg-white text-brand-black px-6 py-3 rounded-xl text-sm font-bold hover:bg-brand-offWhite transition-colors shadow-lg inline-flex items-center gap-2 w-fit"
                    >
                        <ExternalLink size={16} /> Iniciar Apresentação
                    </a>
                </div>
                {/* Decorative Pattern */}
                <div className="absolute top-0 right-0 w-64 h-full opacity-10 bg-brand-pattern mix-blend-overlay"></div>
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-brand-purple rounded-full opacity-30 blur-3xl"></div>
            </div>
        </div>

      </main>
    </div>
  );
};

export default Dashboard;