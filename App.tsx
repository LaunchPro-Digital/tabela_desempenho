import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { User, UserRole, Feedback } from './types';
import { useAppState } from './hooks/useAppState';
import { supabase, signIn, signOut, updatePassword } from './supabaseClient';
import Login from './components/Login';

// Lazy-loaded components (code splitting)
const ChangePassword = React.lazy(() => import('./components/ChangePassword'));
const ChangePasswordModal = React.lazy(() => import('./components/ChangePasswordModal'));
const Dashboard = React.lazy(() => import('./components/Dashboard'));
const CheckIn = React.lazy(() => import('./components/CheckIn'));

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [viewMode, setViewMode] = useState<'checkin' | 'dashboard'>('checkin');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  const isAuthenticated = user !== null && !needsPasswordChange;

  const {
    appState,
    loading,
    updateEntry,
    saveFeedback,
    updateUsers,
  } = useAppState({
    enabled: isAuthenticated,
    userId: user?.id,
    userRole: user?.role as UserRole | undefined,
  });

  // Initialize Theme
  useEffect(() => {
    if (typeof window !== 'undefined') {
        const savedTheme = localStorage.getItem('ordus_theme');
        if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            setIsDarkMode(true);
            document.documentElement.classList.add('dark');
        }
    }
  }, []);

  // Session management via onAuthStateChange
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Find the matching app_user by auth_id or email
        const authEmail = session.user.email;
        const authId = session.user.id;

        const { data: appUser } = await supabase
          .from('app_users')
          .select('*')
          .or(`auth_id.eq.${authId},email.eq.${authEmail}`)
          .single();

        if (appUser) {
          const mappedUser: User = {
            id: appUser.id,
            name: appUser.name,
            role: appUser.role,
            roleTitle: appUser.role_title,
            avatar: appUser.avatar,
            metrics: appUser.metrics || [],
            auth_id: appUser.auth_id,
            email: appUser.email,
            password_changed: appUser.password_changed,
          };

          // If auth_id not yet linked, link it now
          if (!appUser.auth_id) {
            await supabase
              .from('app_users')
              .update({ auth_id: authId })
              .eq('id', appUser.id);
            mappedUser.auth_id = authId;
          }

          setUser(mappedUser);

          // Check if first access (needs password change)
          if (!appUser.password_changed) {
            setNeedsPasswordChange(true);
          } else {
            setNeedsPasswordChange(false);
            if (mappedUser.role === UserRole.PARTNER) {
              setViewMode('dashboard');
            } else {
              setViewMode('checkin');
            }
          }
        }
      } else {
        setUser(null);
        setNeedsPasswordChange(false);
      }

      setAuthLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const toggleTheme = useCallback(() => {
      setIsDarkMode(prev => {
          const newVal = !prev;
          if (newVal) {
              document.documentElement.classList.add('dark');
              localStorage.setItem('ordus_theme', 'dark');
          } else {
              document.documentElement.classList.remove('dark');
              localStorage.setItem('ordus_theme', 'light');
          }
          return newVal;
      });
  }, []);

  const handleLogin = useCallback(async (email: string, password: string): Promise<{ error?: string }> => {
    const { error } = await signIn(email, password);
    if (error) {
      return { error: 'Credenciais inválidas. Verifique seu e-mail e senha.' };
    }
    // onAuthStateChange will handle setting user
    return {};
  }, []);

  const handleChangePassword = useCallback(async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    const { error } = await updatePassword(newPassword);
    if (error) {
      return { success: false, error: error.message };
    }

    // Mark password as changed in app_users
    if (user) {
      await supabase
        .from('app_users')
        .update({ password_changed: true })
        .eq('id', user.id);
    }

    return { success: true };
  }, [user]);

  const handlePasswordChanged = useCallback(() => {
    setNeedsPasswordChange(false);
    if (user) {
      setUser({ ...user, password_changed: true });
      if (user.role === UserRole.PARTNER) {
        setViewMode('dashboard');
      } else {
        setViewMode('checkin');
      }
    }
  }, [user]);

  const handleLogout = useCallback(async () => {
    await signOut();
    setUser(null);
    setNeedsPasswordChange(false);
  }, []);

  const handleSaveMetric = useCallback((metricId: string, inputs: any) => {
    if (!user) return;
    updateEntry(user.id, appState.currentWeek, metricId, inputs);
  }, [user, appState.currentWeek, updateEntry]);

  const handleUpdateEntry = useCallback((userId: string, week: number, metricId: string, inputs: any) => {
    updateEntry(userId, week, metricId, inputs);
  }, [updateEntry]);

  const handleSaveFeedback = useCallback((userId: string, feedback: Feedback) => {
      saveFeedback(userId, feedback);
  }, [saveFeedback]);

  const handleUpdateUsers = useCallback((updatedUsers: User[]) => {
      updateUsers(updatedUsers);
      if (user) {
          const freshUser = updatedUsers.find(u => u.id === user.id);
          if (freshUser) setUser(freshUser);
      }
  }, [updateUsers, user]);

  // Auth still resolving - lightweight spinner
  if (authLoading) {
    return (
      <div className="min-h-screen bg-brand-offWhite dark:bg-brand-darkBg flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not authenticated - show Login immediately (no waiting for data)
  if (!user) {
    return (
        <Login
            onLogin={handleLogin}
            onThemeToggle={toggleTheme}
            isDarkMode={isDarkMode}
        />
    );
  }

  // Data loading after authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-brand-offWhite dark:bg-brand-darkBg flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-purple border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-brand-grey dark:text-slate-400 font-medium">Carregando dados...</p>
        </div>
      </div>
    );
  }

  const suspenseFallback = (
    <div className="min-h-screen bg-brand-offWhite dark:bg-brand-darkBg flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-brand-purple border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // First access - needs password change
  if (needsPasswordChange) {
    return (
      <Suspense fallback={suspenseFallback}>
        <ChangePassword
          user={user}
          onPasswordChanged={handlePasswordChanged}
          onChangePassword={handleChangePassword}
        />
      </Suspense>
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
                        <img src={user.avatar} loading="lazy" className="w-10 h-10 rounded-full border-2 border-white dark:border-brand-darkBorder shadow-sm" />
                        {user.role === UserRole.PARTNER && (
                            <button
                                onClick={() => setViewMode('dashboard')}
                                className="ml-2 text-xs bg-brand-black dark:bg-white text-white dark:text-brand-black px-4 py-2 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors font-bold"
                            >
                                Ir para Cockpit
                            </button>
                        )}
                        <button
                            onClick={() => setShowChangePasswordModal(true)}
                            className="text-xs font-bold text-brand-grey dark:text-slate-400 hover:text-brand-purple ml-2"
                        >
                            Alterar Senha
                        </button>
                        <button onClick={handleLogout} className="text-xs font-bold text-brand-grey dark:text-slate-400 hover:text-red-500 ml-2">SAIR</button>
                  </div>
              </header>
              {showChangePasswordModal && (
                <Suspense fallback={null}>
                  <ChangePasswordModal
                    onClose={() => setShowChangePasswordModal(false)}
                    onChangePassword={handleChangePassword}
                  />
                </Suspense>
              )}
              <Suspense fallback={suspenseFallback}>
                <CheckIn
                  user={user}
                  currentWeek={appState.currentWeek}
                  onSave={handleSaveMetric}
                  appState={appState}
                  onThemeToggle={toggleTheme}
                  isDarkMode={isDarkMode}
                />
              </Suspense>
          </div>
      );
  }

  // Partner Flow
  return (
    <div>
        {/* Helper to switch to personal checkin for partners */}
        <div className="fixed bottom-6 left-6 z-50 flex gap-2">
             <button
                onClick={() => setViewMode('checkin')}
                className="bg-white dark:bg-brand-darkCard border border-gray-200 dark:border-brand-darkBorder text-brand-grey dark:text-slate-300 shadow-xl px-5 py-3 rounded-full text-xs font-bold hover:bg-brand-offWhite dark:hover:bg-slate-800 hover:text-brand-purple dark:hover:text-brand-purple transition-all flex items-center gap-2"
            >
                Meu Check-in
            </button>
            <button
                onClick={() => setShowChangePasswordModal(true)}
                className="bg-white dark:bg-brand-darkCard border border-gray-200 dark:border-brand-darkBorder text-brand-grey dark:text-slate-300 shadow-xl px-5 py-3 rounded-full text-xs font-bold hover:bg-brand-offWhite dark:hover:bg-slate-800 hover:text-brand-purple dark:hover:text-brand-purple transition-all"
            >
                Alterar Senha
            </button>
        </div>
        {showChangePasswordModal && (
          <Suspense fallback={null}>
            <ChangePasswordModal
              onClose={() => setShowChangePasswordModal(false)}
              onChangePassword={handleChangePassword}
            />
          </Suspense>
        )}
        <Suspense fallback={suspenseFallback}>
          <Dashboard
              appState={appState}
              onLogout={handleLogout}
              currentUser={user}
              onUpdateEntry={handleUpdateEntry}
              onUpdateUsers={handleUpdateUsers}
              onSaveFeedback={handleSaveFeedback}
              onThemeToggle={toggleTheme}
              isDarkMode={isDarkMode}
          />
        </Suspense>
    </div>
  );
};

export default App;
