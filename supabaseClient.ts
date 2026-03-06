import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://database.ordusdigital.com.br';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogImFub24iLAogICJpc3MiOiAic3VwYWJhc2UiLAogICJpYXQiOiAxNzE1MDUwODAwLAogICJleHAiOiAxODcyODE3MjAwCn0.pKOBg8evoNpxlrzoGG0YFjascSy2EDnHY0wxNwXMUk8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: 'desempenho' }
});
