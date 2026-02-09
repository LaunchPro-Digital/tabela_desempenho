import React, { useState, useEffect } from 'react';
import { User, UserRole, AppState } from './types';
import { INITIAL_STATE } from './constants';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import CheckIn from './components/CheckIn';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [appState, setAppState] = useState<AppState>(INITIAL_STATE);
  const [viewMode, setViewMode] = useState<'checkin' | 'dashboard'>('checkin');
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Initialize Theme
  useEffect(() => {
    if (typeof window !== 'undefined') {
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setIsDarkMode(true);
            document.documentElement.classList.add('dark');
        }
    }
  }, []);

  const toggleTheme = () => {
      setIsDarkMode(prev => {
          const newVal = !prev;
          if (newVal) {
              document.documentElement.classList.add('dark');
          } else {
              document.documentElement.classList.remove('dark');
          }
          return newVal;
      });
  };

  const handleLogin = (selectedUser: User) => {
    setUser(selectedUser);
    if (selectedUser.role === UserRole.PARTNER) {
        setViewMode('dashboard');
    } else {
        setViewMode('checkin');
    }
  };

  const handleResetPassword = (userId: string, newPass: string) => {
      setAppState(prev => {
          const updatedUsers = prev.users.map(u => {
              if (u.id === userId) {
                  return { ...u, password: newPass };
              }
              return u;
          });
          return { ...prev, users: updatedUsers };
      });
  };

  const handleSaveMetric = (metricId: string, inputs: any) => {
    if (!user) return;
    handleUpdateEntry(user.id, appState.currentWeek, metricId, inputs);
  };

  const handleUpdateEntry = (userId: string, week: number, metricId: string, inputs: any) => {
    setAppState(prev => {
        const existingEntries = prev.entries[userId] || [];
        const filtered = existingEntries.filter(e => !(e.week === week && e.inputs.metricId === metricId));
        
        const newEntry = {
            week: week,
            inputs: inputs,
            calculatedValue: 0,
            timestamp: new Date().toISOString()
        };

        return {
            ...prev,
            entries: {
                ...prev.entries,
                [userId]: [...filtered, newEntry]
            }
        };
    });
  };

  const handleUpdateUsers = (updatedUsers: User[]) => {
      setAppState(prev => ({
          ...prev,
          users: updatedUsers
      }));
      if (user) {
          const freshUser = updatedUsers.find(u => u.id === user.id);
          if (freshUser) setUser(freshUser);
      }
  };

  if (!user) {
    return (
        <Login 
            users={appState.users} 
            onLogin={handleLogin} 
            onThemeToggle={toggleTheme}
            isDarkMode={isDarkMode}
            onResetPassword={handleResetPassword}
        />
    );
  }

  // Contributor Flow
  if (viewMode === 'checkin') {
      return (
          <div className="min-h-screen bg-brand-offWhite dark:bg-brand-darkBg flex flex-col bg-brand-pattern transition-colors duration-300">
              <header className="bg-white dark:bg-brand-darkCard border-b border-gray-200 dark:border-brand-darkBorder px-6 py-4 flex justify-between items-center shadow-sm">
                  <div className="flex items-center gap-2">
                       <div className="w-8 h-8 bg-brand-purple rounded-md flex items-center justify-center text-white font-bold">O</div>
                       <h1 className="font-bold text-brand-black dark:text-white text-xl tracking-tight">ORDUS</h1>
                  </div>
                  <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <span className="block text-sm font-bold text-brand-black dark:text-white">{user.name}</span>
                            <span className="block text-xs text-brand-grey dark:text-slate-400">{user.roleTitle}</span>
                        </div>
                        <img src={user.avatar} className="w-10 h-10 rounded-full border-2 border-white dark:border-brand-darkBorder shadow-sm" />
                        {user.role === UserRole.PARTNER && (
                            <button 
                                onClick={() => setViewMode('dashboard')}
                                className="ml-2 text-xs bg-brand-black dark:bg-white text-white dark:text-brand-black px-4 py-2 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors font-bold"
                            >
                                Ir para Cockpit
                            </button>
                        )}
                        <button onClick={() => setUser(null)} className="text-xs font-bold text-brand-grey dark:text-slate-400 hover:text-red-500 ml-2">SAIR</button>
                  </div>
              </header>
              <CheckIn 
                user={user} 
                currentWeek={appState.currentWeek} 
                onSave={handleSaveMetric} 
                appState={appState}
                onThemeToggle={toggleTheme}
                isDarkMode={isDarkMode}
              />
          </div>
      );
  }

  // Partner Flow
  return (
    <div>
        {/* Helper to switch to personal checkin for partners */}
        <div className="fixed bottom-6 left-6 z-50">
             <button 
                onClick={() => setViewMode('checkin')}
                className="bg-white dark:bg-brand-darkCard border border-gray-200 dark:border-brand-darkBorder text-brand-grey dark:text-slate-300 shadow-xl px-5 py-3 rounded-full text-xs font-bold hover:bg-brand-offWhite dark:hover:bg-slate-800 hover:text-brand-purple dark:hover:text-brand-purple transition-all flex items-center gap-2"
            >
                Meu Check-in
            </button>
        </div>
        <Dashboard 
            appState={appState} 
            onLogout={() => setUser(null)} 
            currentUser={user}
            onUpdateEntry={handleUpdateEntry}
            onUpdateUsers={handleUpdateUsers}
            onThemeToggle={toggleTheme}
            isDarkMode={isDarkMode}
        />
    </div>
  );
};

export default App;