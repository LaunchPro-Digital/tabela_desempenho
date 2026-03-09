import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAppState } from '../useAppState';
import { MetricType, UserRole, Feedback } from '../../types';

// ─── Supabase Mock (table-aware) ────────────────────────────────────────────

let mockResponses: Record<string, { data: any; error: any }> = {};
const mockUpsert = vi.fn(() => Promise.resolve({ error: null }));

vi.mock('../../supabaseClient', () => ({
  supabase: {
    from: (table: string) => ({
      select: (_cols?: string) => ({
        order: (_col: string) => Promise.resolve(mockResponses[table] ?? { data: [], error: null }),
        eq: (_col: string, _val: any) => ({
          single: () => Promise.resolve(mockResponses[table] ?? { data: null, error: null }),
        }),
        then: (resolve: (val: any) => void) => resolve(mockResponses[table] ?? { data: [], error: null }),
      }),
      upsert: (...args: any[]) => {
        mockUpsert(...args);
        return Promise.resolve({ error: null });
      },
    }),
  },
}));

// ─── Sample Data ────────────────────────────────────────────────────────────

const sampleDbUsers = [
  {
    id: 'u1',
    name: 'Test User',
    role: UserRole.CONTRIBUTOR,
    role_title: 'Dev',
    avatar: 'https://example.com/avatar.jpg',
    metrics: [
      {
        id: 'm1',
        title: 'Metric 1',
        targetValue: 80,
        type: MetricType.PERCENTAGE_CUMULATIVE,
        unit: '%',
        inputs: [
          { key: 'total', label: 'Total', type: 'number' },
          { key: 'success', label: 'Success', type: 'number' },
        ],
      },
    ],
    email: 'test@example.com',
    password_changed: false,
    auth_id: 'auth-1',
  },
];

const sampleDbEntries = [
  {
    user_id: 'u1',
    week: 1,
    metric_id: 'm1',
    inputs: { total: 100, success: 90 },
    calculated_value: 90,
    created_at: '2025-01-01T00:00:00Z',
  },
];

const sampleDbFeedback = [
  {
    user_id: 'u1',
    week: 1,
    blockers: 'Blocker 1',
    commitment: 'Commitment 1',
    learning: 'Learning 1',
    commitment_completed: false,
    timestamp: '2025-01-01T00:00:00Z',
  },
];

// ─── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockResponses = {
    app_users: { data: sampleDbUsers, error: null },
    weekly_entries: { data: sampleDbEntries, error: null },
    weekly_feedback: { data: sampleDbFeedback, error: null },
    app_config: { data: { value: '4' }, error: null },
  };
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('useAppState', () => {
  describe('loadState', () => {
    it('carrega dados do Supabase e seta loading=false', async () => {
      const { result } = renderHook(() => useAppState());
      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.appState.users).toHaveLength(1);
      expect(result.current.appState.users[0].name).toBe('Test User');
      expect(result.current.appState.users[0].roleTitle).toBe('Dev');
    });

    it('mapeia entries corretamente com metricId injetado', async () => {
      const { result } = renderHook(() => useAppState());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const entries = result.current.appState.entries['u1'];
      expect(entries).toBeDefined();
      expect(entries).toHaveLength(1);
      expect(entries[0].inputs.metricId).toBe('m1');
      expect(entries[0].week).toBe(1);
    });

    it('mapeia feedback corretamente', async () => {
      const { result } = renderHook(() => useAppState());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const fb = result.current.appState.feedback['u1'];
      expect(fb).toBeDefined();
      expect(fb).toHaveLength(1);
      expect(fb[0].blockers).toBe('Blocker 1');
    });

    it('carrega currentWeek do app_config', async () => {
      const { result } = renderHook(() => useAppState());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.appState.currentWeek).toBe(4);
    });

    it('usa INITIAL_STATE quando users retorna vazio (seed path)', async () => {
      mockResponses.app_users = { data: [], error: null };

      const { result } = renderHook(() => useAppState());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // When users are empty, seedInitialData is called and INITIAL_STATE is set
      // The upsert should be called for seeding
      expect(mockUpsert).toHaveBeenCalled();
    });

    it('usa INITIAL_STATE em caso de erro do Supabase', async () => {
      mockResponses.app_users = { data: null, error: { message: 'DB Error' } };

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { result } = renderHook(() => useAppState());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('updateEntry', () => {
    it('atualiza state local otimisticamente', async () => {
      const { result } = renderHook(() => useAppState());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.updateEntry('u1', 2, 'm1', {
          metricId: 'm1',
          total: 50,
          success: 40,
        });
      });

      const userEntries = result.current.appState.entries['u1'] || [];
      const newEntry = userEntries.find(
        e => e.week === 2 && e.inputs.metricId === 'm1'
      );
      expect(newEntry).toBeDefined();
      expect(newEntry!.inputs.total).toBe(50);
      expect(newEntry!.inputs.success).toBe(40);
    });

    it('substitui entry existente na mesma semana+métrica', async () => {
      const { result } = renderHook(() => useAppState());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Update same week/metric as existing entry
      await act(async () => {
        await result.current.updateEntry('u1', 1, 'm1', {
          metricId: 'm1',
          total: 200,
          success: 180,
        });
      });

      const userEntries = result.current.appState.entries['u1'] || [];
      const weekOneEntries = userEntries.filter(
        e => e.week === 1 && e.inputs.metricId === 'm1'
      );
      // Should only have one entry for week 1, m1 (replaced, not duplicated)
      expect(weekOneEntries).toHaveLength(1);
      expect(weekOneEntries[0].inputs.total).toBe(200);
    });

    it('persiste no Supabase via upsert', async () => {
      const { result } = renderHook(() => useAppState());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.updateEntry('u1', 3, 'm1', {
          metricId: 'm1',
          total: 100,
          success: 80,
        });
      });

      expect(mockUpsert).toHaveBeenCalled();
      const upsertArg = mockUpsert.mock.calls[mockUpsert.mock.calls.length - 1][0];
      expect(upsertArg.user_id).toBe('u1');
      expect(upsertArg.week).toBe(3);
      expect(upsertArg.metric_id).toBe('m1');
      // cleanInputs should NOT contain metricId
      expect(upsertArg.inputs?.metricId).toBeUndefined();
    });
  });

  describe('saveFeedback', () => {
    it('atualiza feedback local otimisticamente', async () => {
      const { result } = renderHook(() => useAppState());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const newFeedback: Feedback = {
        week: 2,
        blockers: 'New blocker',
        commitment: 'New commitment',
        learning: 'New learning',
        commitmentCompleted: false,
        timestamp: '2025-01-08T00:00:00Z',
      };

      await act(async () => {
        await result.current.saveFeedback('u1', newFeedback);
      });

      const fb = result.current.appState.feedback['u1'];
      const week2 = fb?.find(f => f.week === 2);
      expect(week2).toBeDefined();
      expect(week2!.blockers).toBe('New blocker');
      expect(week2!.commitment).toBe('New commitment');
    });

    it('substitui feedback existente na mesma semana', async () => {
      const { result } = renderHook(() => useAppState());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const updatedFeedback: Feedback = {
        week: 1, // same week as existing
        blockers: 'Updated blocker',
        commitment: 'Updated commitment',
        learning: 'Updated learning',
      };

      await act(async () => {
        await result.current.saveFeedback('u1', updatedFeedback);
      });

      const fb = result.current.appState.feedback['u1'];
      const week1Entries = fb?.filter(f => f.week === 1);
      expect(week1Entries).toHaveLength(1);
      expect(week1Entries![0].blockers).toBe('Updated blocker');
    });

    it('persiste feedback no Supabase via upsert', async () => {
      const { result } = renderHook(() => useAppState());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.saveFeedback('u1', {
          week: 3,
          blockers: 'Test',
          commitment: 'Test',
          learning: 'Test',
        });
      });

      expect(mockUpsert).toHaveBeenCalled();
    });
  });

  describe('updateUsers', () => {
    it('atualiza lista de usuários no state local', async () => {
      const { result } = renderHook(() => useAppState());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const updatedUsers = [
        {
          ...result.current.appState.users[0],
          name: 'Updated Name',
          roleTitle: 'Senior Dev',
        },
      ];

      await act(async () => {
        await result.current.updateUsers(updatedUsers);
      });

      expect(result.current.appState.users[0].name).toBe('Updated Name');
      expect(result.current.appState.users[0].roleTitle).toBe('Senior Dev');
    });

    it('persiste no Supabase via upsert', async () => {
      const { result } = renderHook(() => useAppState());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.updateUsers(result.current.appState.users);
      });

      expect(mockUpsert).toHaveBeenCalled();
    });
  });

  describe('API retornada', () => {
    it('expõe appState, loading, updateEntry, saveFeedback, updateUsers', async () => {
      const { result } = renderHook(() => useAppState());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.appState).toBeDefined();
      expect(result.current.loading).toBe(false);
      expect(result.current.updateEntry).toBeInstanceOf(Function);
      expect(result.current.saveFeedback).toBeInstanceOf(Function);
      expect(result.current.updateUsers).toBeInstanceOf(Function);
    });
  });
});
