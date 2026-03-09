import { useState, useEffect, useCallback } from 'react';
import { AppState, User, UserRole, Feedback } from '../types';
import { supabase } from '../supabaseClient';
import { INITIAL_STATE } from '../constants';
import { getQuarterInfo, DEFAULT_QUARTER_CONFIG, QuarterConfig } from '../services/quarterUtils';

interface UseAppStateOptions {
  enabled?: boolean;
  userId?: string;
  userRole?: UserRole;
}

export const useAppState = (enabledOrOptions: boolean | UseAppStateOptions = true) => {
  // Support both old boolean signature and new options object
  const options: UseAppStateOptions = typeof enabledOrOptions === 'boolean'
    ? { enabled: enabledOrOptions }
    : enabledOrOptions;
  const { enabled = true, userId, userRole } = options;
  const [appState, setAppState] = useState<AppState>(INITIAL_STATE);
  const [loading, setLoading] = useState(true);

  // ─── LOAD ──────────────────────────────────────────────────────────────────

  const loadState = useCallback(async () => {
    setLoading(true);
    try {
      // Contributors only need their own data; Partners need all
      const isContributor = userRole === UserRole.CONTRIBUTOR && userId;

      let entriesQuery = supabase.from('weekly_entries').select('*');
      let feedbackQuery = supabase.from('weekly_feedback').select('*');
      if (isContributor) {
        entriesQuery = entriesQuery.eq('user_id', userId);
        feedbackQuery = feedbackQuery.eq('user_id', userId);
      }

      // Parallel fetch: all 4 queries at once
      const [usersResult, entriesResult, feedbackResult, configResult] = await Promise.all([
        supabase.from('app_users').select('*').order('name'),
        entriesQuery,
        feedbackQuery,
        supabase.from('app_config').select('key, value').in('key', ['current_week', 'quarter_start', 'quarter_end']),
      ]);

      const { data: usersData, error: usersError } = usersResult;
      if (usersError) throw usersError;

      const users: User[] = (usersData || []).map(u => ({
        id: u.id,
        name: u.name,
        role: u.role,
        roleTitle: u.role_title,
        avatar: u.avatar,
        metrics: u.metrics || [],
        auth_id: u.auth_id,
        email: u.email,
        password_changed: u.password_changed,
      }));

      const { data: entriesData, error: entriesError } = entriesResult;
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

      const { data: feedbackData, error: feedbackError } = feedbackResult;
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

      const { data: configData } = configResult;

      // Build config map from all app_config rows
      const configMap: Record<string, string> = {};
      (configData || []).forEach((row: { key: string; value: string }) => {
        configMap[row.key] = row.value;
      });

      // Calculate quarter info from saved dates or defaults
      const quarterConfig: QuarterConfig = {
        startDate: configMap['quarter_start'] || DEFAULT_QUARTER_CONFIG.startDate,
        endDate: configMap['quarter_end'] || DEFAULT_QUARTER_CONFIG.endDate,
      };
      const quarterInfo = getQuarterInfo(quarterConfig);

      // Use auto-calculated current week from quarter dates
      const currentWeek = quarterInfo.currentWeek;

      // Se não há usuários no banco ainda, semeia com os dados iniciais
      if (users.length === 0) {
        await seedInitialData(INITIAL_STATE);
        setAppState(INITIAL_STATE);
      } else {
        setAppState({ users, entries, feedback, currentWeek, quarterInfo });
      }
    } catch (err) {
      console.error('Erro ao carregar estado:', err);
      setAppState(INITIAL_STATE);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      loadState();
    } else {
      setLoading(false);
    }
  }, [loadState, enabled]);

  // ─── SEED (primeira execução) ──────────────────────────────────────────────

  const seedInitialData = async (state: AppState) => {
    const usersToInsert = state.users.map(u => ({
      id: u.id,
      name: u.name,
      role: u.role,
      role_title: u.roleTitle,
      avatar: u.avatar,
      metrics: u.metrics,
      email: u.email || null,
      password_changed: u.password_changed || false,
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
      metrics: u.metrics,
      email: u.email || null,
      password_changed: u.password_changed || false,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('app_users')
      .upsert(usersToUpsert, { onConflict: 'id' });

    if (error) console.error('Erro ao atualizar usuários:', error);
  }, []);

  const saveQuarterConfig = useCallback(async (startDate: string, endDate: string) => {
    // Upsert quarter_start and quarter_end in app_config
    const { error: startError } = await supabase
      .from('app_config')
      .upsert({ key: 'quarter_start', value: startDate }, { onConflict: 'key' });

    const { error: endError } = await supabase
      .from('app_config')
      .upsert({ key: 'quarter_end', value: endDate }, { onConflict: 'key' });

    if (startError) console.error('Erro ao salvar quarter_start:', startError);
    if (endError) console.error('Erro ao salvar quarter_end:', endError);

    // Recalculate and update state
    const newQuarterInfo = getQuarterInfo({ startDate, endDate });

    // Also update the legacy current_week key for backward compat
    await supabase
      .from('app_config')
      .upsert({ key: 'current_week', value: String(newQuarterInfo.currentWeek) }, { onConflict: 'key' });

    setAppState(prev => ({
      ...prev,
      currentWeek: newQuarterInfo.currentWeek,
      quarterInfo: newQuarterInfo,
    }));
  }, []);

  return {
    appState,
    loading,
    updateEntry,
    saveFeedback,
    updateUsers,
    saveQuarterConfig,
  };
};
