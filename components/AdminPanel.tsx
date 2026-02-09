import React, { useState } from 'react';
import { User, UserRole, Metric, MetricType, MetricInputConfig } from '../types';
import { Trash2, Plus, X, Save, Edit2, ChevronLeft, Upload } from 'lucide-react';

interface AdminPanelProps {
  users: User[];
  onUpdateUsers: (users: User[]) => void;
  onClose: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ users, onUpdateUsers, onClose }) => {
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'edit'>('list');

  // New User Template
  const createNewUser = (): User => ({
    id: `u_${Date.now()}`,
    name: '',
    role: UserRole.CONTRIBUTOR,
    roleTitle: '',
    avatar: `https://picsum.photos/seed/${Date.now()}/150/150`,
    password: '123',
    metrics: []
  });

  const handleEditUser = (user: User) => {
    setEditingUser({ ...user }); // Deep copyish
    setActiveTab('edit');
  };

  const handleDeleteUser = (userId: string) => {
    if (confirm('Tem certeza que deseja remover este colaborador?')) {
      onUpdateUsers(users.filter(u => u.id !== userId));
    }
  };

  const handleSaveUser = () => {
    if (!editingUser) return;
    if (!editingUser.name) return alert('Nome é obrigatório');

    const exists = users.find(u => u.id === editingUser.id);
    let newUsers = [...users];
    
    if (exists) {
      newUsers = newUsers.map(u => u.id === editingUser.id ? editingUser : u);
    } else {
      newUsers.push(editingUser);
    }
    
    onUpdateUsers(newUsers);
    setEditingUser(null);
    setActiveTab('list');
  };

  const handleAddMetric = () => {
    if (!editingUser) return;
    const newMetric: Metric = {
        id: `m_${Date.now()}`,
        title: 'Nova Meta',
        targetValue: 10,
        unit: 'un',
        type: MetricType.SUM_TARGET,
        inputs: [{ key: `inp_${Date.now()}`, label: 'Valor da meta', type: 'number' }]
    };
    setEditingUser({
        ...editingUser,
        metrics: [...editingUser.metrics, newMetric]
    });
  };

  const handleUpdateMetric = (index: number, field: keyof Metric, value: any) => {
    if (!editingUser) return;
    const updatedMetrics = [...editingUser.metrics];
    updatedMetrics[index] = { ...updatedMetrics[index], [field]: value };
    setEditingUser({ ...editingUser, metrics: updatedMetrics });
  };
  
  const handleUpdateInputLabel = (metricIndex: number, inputIndex: number, newLabel: string) => {
      if (!editingUser) return;
      const updatedMetrics = [...editingUser.metrics];
      updatedMetrics[metricIndex].inputs[inputIndex].label = newLabel;
      setEditingUser({ ...editingUser, metrics: updatedMetrics });
  };

  const handleRemoveMetric = (index: number) => {
    if (!editingUser) return;
    const updatedMetrics = editingUser.metrics.filter((_, i) => i !== index);
    setEditingUser({ ...editingUser, metrics: updatedMetrics });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && editingUser) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setEditingUser({ ...editingUser, avatar: reader.result as string });
          };
          reader.readAsDataURL(file);
      }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 dark:bg-black z-50 flex flex-col">
        {/* Admin Header */}
        <div className="bg-slate-800 dark:bg-brand-darkCard px-6 py-4 flex items-center justify-between border-b border-slate-700 dark:border-brand-darkBorder">
            <div className="flex items-center gap-4">
                {activeTab === 'edit' && (
                    <button onClick={() => setActiveTab('list')} className="md:hidden text-white">
                        <ChevronLeft />
                    </button>
                )}
                <div>
                    <h2 className="text-white text-xl font-bold">Gestão do Time</h2>
                    <p className="text-slate-400 text-sm">Adicionar, editar e remover colaboradores e metas.</p>
                </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-700 dark:hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors">
                <X size={24} />
            </button>
        </div>

        <div className="flex-1 overflow-hidden flex">
            
            {/* Sidebar List */}
            <div className={`w-full md:w-1/3 lg:w-1/4 bg-slate-800 dark:bg-brand-darkCard border-r border-slate-700 dark:border-brand-darkBorder flex flex-col ${activeTab === 'edit' ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4">
                    <button 
                        onClick={() => {
                            setEditingUser(createNewUser());
                            setActiveTab('edit');
                        }}
                        className="w-full bg-brand-purple hover:bg-brand-purpleDark text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 mb-4 transition-colors"
                    >
                        <Plus size={18} /> Novo Colaborador
                    </button>
                    <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-200px)]">
                        {users.map(u => (
                            <div key={u.id} className="flex items-center justify-between p-3 bg-slate-700/50 dark:bg-slate-800/50 rounded-lg hover:bg-slate-700 dark:hover:bg-slate-800 cursor-pointer group" onClick={() => handleEditUser(u)}>
                                <div className="flex items-center gap-3">
                                    <img src={u.avatar} className="w-10 h-10 rounded-full object-cover" />
                                    <div>
                                        <p className="text-white font-medium">{u.name}</p>
                                        <p className="text-xs text-slate-400">{u.roleTitle}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleDeleteUser(u.id); }}
                                    className="text-slate-500 hover:text-red-400 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Edit Form */}
            <div className={`flex-1 bg-slate-50 dark:bg-brand-darkBg overflow-y-auto p-6 md:p-10 ${activeTab === 'list' ? 'hidden md:block' : 'block'}`}>
                {!editingUser ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <Edit2 size={48} className="mb-4 opacity-20" />
                        <p>Selecione um colaborador para editar ou crie um novo.</p>
                    </div>
                ) : (
                    <div className="max-w-3xl mx-auto space-y-8 pb-20 animate-fade-in">
                         {/* Back Button for Desktop too if desired, but mainly for mobile context */}
                         <button 
                            onClick={() => setActiveTab('list')} 
                            className="flex items-center gap-2 text-brand-grey dark:text-slate-400 hover:text-brand-purple mb-4 md:hidden"
                        >
                            <ChevronLeft size={16} /> Voltar para lista
                        </button>

                        {/* User Details */}
                        <div className="bg-white dark:bg-brand-darkCard p-6 rounded-xl shadow-sm border border-slate-200 dark:border-brand-darkBorder relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-brand-purple"></div>
                            <div className="flex items-start justify-between mb-6 border-b dark:border-slate-700 pb-4">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Dados do Colaborador</h3>
                                <div className="flex flex-col items-center gap-2">
                                    <img src={editingUser.avatar} className="w-16 h-16 rounded-full border-2 border-brand-purple object-cover" />
                                    <label className="text-xs text-brand-purple hover:text-brand-purpleDark cursor-pointer font-bold flex items-center gap-1">
                                        <Upload size={12} /> Alterar Foto
                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                    </label>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Nome</label>
                                    <input 
                                        type="text" 
                                        value={editingUser.name} 
                                        onChange={e => setEditingUser({...editingUser, name: e.target.value})}
                                        className="w-full border border-gray-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-lg p-2.5 focus:border-brand-purple outline-none" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Cargo / Função</label>
                                    <input 
                                        type="text" 
                                        value={editingUser.roleTitle} 
                                        onChange={e => setEditingUser({...editingUser, roleTitle: e.target.value})}
                                        className="w-full border border-gray-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-lg p-2.5 focus:border-brand-purple outline-none" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Senha de Acesso</label>
                                    <input 
                                        type="text" 
                                        value={editingUser.password} 
                                        onChange={e => setEditingUser({...editingUser, password: e.target.value})}
                                        className="w-full border border-gray-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-lg p-2.5 font-mono bg-slate-50 focus:border-brand-purple outline-none" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Tipo de Acesso</label>
                                    <select 
                                        value={editingUser.role} 
                                        onChange={e => setEditingUser({...editingUser, role: e.target.value as UserRole})}
                                        className="w-full border border-gray-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-lg p-2.5 focus:border-brand-purple outline-none"
                                    >
                                        <option value={UserRole.CONTRIBUTOR}>Colaborador (Time)</option>
                                        <option value={UserRole.PARTNER}>Sócio (Admin)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Metrics Config */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Metas Trimestrais</h3>
                                <button onClick={handleAddMetric} className="text-sm bg-brand-green/10 text-brand-greenDark dark:text-brand-green px-4 py-2 rounded-lg hover:bg-brand-green/20 font-bold transition-colors">
                                    + Adicionar Meta
                                </button>
                            </div>
                            
                            {editingUser.metrics.map((metric, idx) => (
                                <div key={metric.id} className="bg-white dark:bg-brand-darkCard p-6 rounded-xl shadow-sm border border-slate-200 dark:border-brand-darkBorder relative group">
                                    <button 
                                        onClick={() => handleRemoveMetric(idx)}
                                        className="absolute top-4 right-4 text-slate-300 hover:text-red-500"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-xs uppercase font-bold text-slate-400 mb-1">Título da Meta</label>
                                            <input 
                                                type="text" 
                                                value={metric.title}
                                                onChange={e => handleUpdateMetric(idx, 'title', e.target.value)}
                                                className="w-full font-bold text-lg border-b border-slate-300 dark:border-slate-700 dark:bg-transparent dark:text-white focus:border-brand-purple outline-none pb-1"
                                                placeholder="Ex: Reduzir CPA"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs uppercase font-bold text-slate-400 mb-1">Alvo (Target)</label>
                                            <input 
                                                type="number" 
                                                value={metric.targetValue}
                                                onChange={e => handleUpdateMetric(idx, 'targetValue', parseFloat(e.target.value))}
                                                className="w-full border border-gray-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded p-2 focus:border-brand-purple outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs uppercase font-bold text-slate-400 mb-1">Unidade</label>
                                            <input 
                                                type="text" 
                                                value={metric.unit}
                                                onChange={e => handleUpdateMetric(idx, 'unit', e.target.value)}
                                                className="w-full border border-gray-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded p-2 focus:border-brand-purple outline-none"
                                                placeholder="%, un, R$, pts"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs uppercase font-bold text-slate-400 mb-1">Tipo de Cálculo</label>
                                            <select 
                                                value={metric.type}
                                                onChange={e => handleUpdateMetric(idx, 'type', e.target.value)}
                                                className="w-full border border-gray-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded p-2 focus:border-brand-purple outline-none"
                                            >
                                                <option value={MetricType.PERCENTAGE_CUMULATIVE}>Percentual Acumulativo (Soma/Soma)</option>
                                                <option value={MetricType.PERCENTAGE_AVERAGE}>Média de Percentual</option>
                                                <option value={MetricType.SUM_TARGET}>Soma Simples (Acumulado)</option>
                                                <option value={MetricType.MAX_LIMIT}>Limite Máximo (Média)</option>
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-100 dark:border-slate-800">
                                        <p className="font-bold mb-2 text-xs uppercase text-slate-500 dark:text-slate-400">Perguntas de Check-in (Editável):</p>
                                        {metric.inputs.map((inp, i) => (
                                            <div key={i} className="flex gap-2 mb-2 last:mb-0 items-center">
                                                <span className="font-mono text-xs bg-white dark:bg-slate-800 px-1 border dark:border-slate-700 rounded text-slate-400">{inp.key}</span>
                                                <input 
                                                    type="text" 
                                                    value={inp.label}
                                                    onChange={(e) => handleUpdateInputLabel(idx, i, e.target.value)}
                                                    className="flex-1 text-sm border-b border-slate-300 dark:border-slate-700 bg-transparent focus:border-brand-purple outline-none pb-1 dark:text-white"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-4 pt-6">
                            <button 
                                onClick={handleSaveUser}
                                className="flex-1 bg-brand-green hover:bg-brand-greenDark text-white font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                            >
                                <Save size={20} /> Salvar Alterações
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default AdminPanel;