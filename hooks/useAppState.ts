import { useState, useEffect, useCallback } from 'react';
import { AppState, User, Feedback } from '../types';
import { supabase } from '../supabaseClient';
import { INITIAL_STATE } from '../constants';

export const useAppState = () => {
  const [appState, setAppState] = useState<AppState>(INITIAL_STATE);
  const [loading, setLoading] = useState(true);

  // ─── LOAD ──────────────────────────────────────────────────────────────────

  const loadState = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Usuários
      const { data: usersData, error: usersError } = await supabase
        .from('app_users')
        .select('*')
        .order('name');

      if (usersError) throw usersError;

      const users: User[] = (usersData || []).map(u => ({
        id: u.id,
        name: u.name,
        role: u.role,
        roleTitle: u.role_title,
        avatar: u.avatar,
        password: u.password,
        metrics: u.metrics || [],
      }));

      // 2. Entradas semanais
      const { data: entriesData, error: entriesError } = await supabase
        .from('weekly_entries')
        .select('*');

      if (entriesError) throw entriesError;

      const entries: Record<string, any[]> = {};
      (entriesData || []).forEach(e => {
        if (!entries[e.user_id]) entries[e.user_id] = [];
        entries[e.user_id].push({
          week: e.week,
          inputs: { ...e.inputs, metricId: e.metric_id },
          calculatedValue: e.calculated_value,
          timestamp: e.created_at,
        });
      });

      // 3. Feedbacks
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('weekly_feedback')
        .select('*');

      if (feedbackError) throw feedbackError;

      const feedback: Record<string, Feedback[]> = {};
      (feedbackData || []).forEach(f => {
        if (!feedback[f.user_id]) feedback[f.user_id] = [];
        feedback[f.user_id].push({
          week: f.week,
          blockers: f.blockers,
          commitment: f.commitment,
          learning: f.learning,
          commitmentCompleted: f.commitment_completed,
          timestamp: f.timestamp,
        });
      });

      // 4. Config (semana atual)
      const { data: configData } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'current_week')
        .single();

      const currentWeek = configData ? Number(configData.value) : INITIAL_STATE.currentWeek;

      // Se não há usuários no banco ainda, semeia com os dados iniciais
      if (users.length === 0) {
        await seedInitialData(INITIAL_STATE);
        setAppState(INITIAL_STATE);
      } else {
        setAppState({ users, entries, feedback, currentWeek });
      }
    } catch (err) {
      console.error('Erro ao carregar estado:', err);
      setAppState(INITIAL_STATE);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadState();
  }, [loadState]);

  // ─── SEED (primeira execução) ──────────────────────────────────────────────

  const seedInitialData = async (state: AppState) => {
    const usersToInsert = state.users.map(u => ({
      id: u.id,
      name: u.name,
      role: u.role,
      role_title: u.roleTitle,
      avatar: u.avatar,
      password: u.password || '123',
      metrics: u.metrics,
    }));

    const { error: usersError } = await supabase
      .from('app_users')
      .upsert(usersToInsert, { onConflict: 'id' });

    if (usersError) {
      console.error('Erro ao semear usuários:', usersError);
      return;
    }

    // Semear entradas históricas
    const entriesToInsert: any[] = [];
    Object.entries(state.entries).forEach(([userId, userEntries]) => {
      userEntries.forEach(entry => {
        const metricId = entry.inputs.metricId;
        if (!metricId) return;
        const { metricId: _, ...cleanInputs } = entry.inputs;
        entriesToInsert.push({
          user_id: userId,
          week: entry.week,
          metric_id: metricId,
          inputs: cleanInputs,
          calculated_value: entry.calculatedValue || 0,
        });
      });
    });

    if (entriesToInsert.length > 0) {
      await supabase
        .from('weekly_entries')
        .upsert(entriesToInsert, { onConflict: 'user_id,week,metric_id' });
    }
  };

  // ─── MUTATIONS ────────────────────────────────────────────────────────────

  const updateEntry = useCallback(async (
    userId: string,
    week: number,
    metricId: string,
    inputs: any
  ) => {
    const { metricId: _, ...cleanInputs } = inputs;

    // Otimista: atualiza local imediatamente
    setAppState(prev => {
      const existingEntries = prev.entries[userId] || [];
      const filtered = existingEntries.filter(
        e => !(e.week === week && e.inputs.metricId === metricId)
      );
      return {
        ...prev,
        entries: {
          ...prev.entries,
          [userId]: [...filtered, {
            week,
            inputs: { ...cleanInputs, metricId },
            calculatedValue: 0,
            timestamp: new Date().toISOString(),
          }],
        },
      };
    });

    // Persiste no Supabase
    const { error } = await supabase
      .from('weekly_entries')
      .upsert({
        user_id: userId,
        week,
        metric_id: metricId,
        inputs: cleanInputs,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,week,metric_id' });

    if (error) console.error('Erro ao salvar entrada:', error);
  }, []);

  const saveFeedback = useCallback(async (userId: string, feedback: Feedback) => {
    // Otimista
    setAppState(prev => {
      const userFeedbacks = prev.feedback[userId] || [];
      const others = userFeedbacks.filter(f => f.week !== feedback.week);
      return {
        ...prev,
        feedback: {
          ...prev.feedback,
          [userId]: [...others, feedback],
        },
      };
    });

    // Persiste
    const { error } = await supabase
      .from('weekly_feedback')
      .upsert({
        user_id: userId,
        week: feedback.week,
        blockers: feedback.blockers || '',
        commitment: feedback.commitment || '',
        learning: feedback.learning || '',
        commitment_completed: feedback.commitmentCompleted || false,
        timestamp: feedback.timestamp || new Date().toISOString(),
      }, { onConflict: 'user_id,week' });

    if (error) console.error('Erro ao salvar feedback:', error);
  }, []);

  const updateUsers = useCallback(async (updatedUsers: User[]) => {
    setAppState(prev => ({ ...prev, users: updatedUsers }));

    const usersToUpsert = updatedUsers.map(u => ({
      id: u.id,
      name: u.name,
      role: u.role,
      role_title: u.roleTitle,
      avatar: u.avatar,
      password: u.password || '123',
      metrics: u.metrics,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('app_users')
      .upsert(usersToUpsert, { onConflict: 'id' });

    if (error) console.error('Erro ao atualizar usuários:', error);
  }, []);

  const resetPassword = useCallback(async (userId: string, newPassword: string) => {
    setAppState(prev => ({
      ...prev,
      users: prev.users.map(u => u.id === userId ? { ...u, password: newPassword } : u),
    }));

    const { error } = await supabase
      .from('app_users')
      .update({ password: newPassword, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) console.error('Erro ao resetar senha:', error);
  }, []);

  return {
    appState,
    loading,
    updateEntry,
    saveFeedback,
    updateUsers,
    resetPassword,
  };
};
