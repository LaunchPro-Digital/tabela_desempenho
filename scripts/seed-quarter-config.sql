-- Insert quarter configuration into app_config
-- Q1 2026: January 1 - March 31

INSERT INTO public.app_config (key, value)
VALUES
  ('quarter_start', '2026-01-01'),
  ('quarter_end', '2026-03-31')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
