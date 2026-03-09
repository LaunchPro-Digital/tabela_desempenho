-- ============================================================================
-- DEPRECATION: manage_user RPC → Edge Function manage-user
-- Story 2.2 — Migrar manage_user CREATE para Edge Function
-- ============================================================================
-- This migration drops the old manage_user PostgreSQL function.
-- All user management operations (create, delete, reset_password) are now
-- handled by the Edge Function `manage-user` which uses GoTrue Admin API.
--
-- PREREQUISITES before running this migration:
--   1. Edge Function `manage-user` deployed: supabase functions deploy manage-user
--   2. SUPABASE_SERVICE_ROLE_KEY configured as Edge Function secret
--   3. Verified user creation works via Edge Function
--
-- ROLLBACK: Re-run the manage_user function definition from migration_cloud.sql
-- ============================================================================

DROP FUNCTION IF EXISTS public.manage_user(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT
);
