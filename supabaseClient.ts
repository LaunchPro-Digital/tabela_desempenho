import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Auth Helpers ──────────────────────────────────────────────────────────

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const updatePassword = async (newPassword: string) => {
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  return { data, error };
};

export const resetPasswordForEmail = async (email: string) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email);
  return { data, error };
};

// ─── Manage User (Edge Function) ────────────────────────────────────────

interface ManageUserParams {
  action: 'create' | 'delete' | 'reset_password';
  user_email?: string;
  user_name?: string;
  user_role?: string;
  user_role_title?: string;
  user_avatar?: string;
  user_metrics?: any;
  target_user_id?: string;
}

interface ManageUserResult {
  success: boolean;
  error?: string;
  user_id?: string;
  auth_id?: string;
}

export const manageUser = async (params: ManageUserParams): Promise<ManageUserResult> => {
  const { data, error } = await supabase.functions.invoke('manage-user', {
    body: params,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return data as ManageUserResult;
};
