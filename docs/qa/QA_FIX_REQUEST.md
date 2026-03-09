# QA Fix Request: Performance Audit

**Generated:** 2026-03-09T22:00:00Z
**QA Report Source:** QA Performance Audit (browser + code analysis)
**Reviewer:** Quinn (Test Architect)
**App URL:** https://desempenho.ordusdigital.com.br

---

## Instructions for @dev

Fix ONLY the issues listed below. Do not add features or refactor unrelated code.

**Process:**

1. Read each issue carefully
2. Fix the specific problem described
3. Verify using the verification steps provided
4. Mark the issue as fixed in this document
5. Run all tests before marking complete

---

## Summary

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 4 | Must fix before merge |
| HIGH | 3 | Should fix before merge |
| MEDIUM | 4 | Recommended improvements |
| LOW | 2 | Optional improvements |

**User-reported symptoms:** App muito lento para carregar e telas não avançam, principalmente no Windows.

---

## Issues to Fix

### 1. [CRITICAL] 4 queries Supabase sequenciais bloqueiam carregamento

**Issue ID:** FIX-PERF-001

**Location:** `hooks/useAppState.ts:16-78`

**Problem:**

```typescript
// Query 1: users (line 16-19)
const { data: usersData } = await supabase.from('app_users').select('*').order('name');

// Query 2: entries (line 36-38) — espera Query 1 terminar
const { data: entriesData } = await supabase.from('weekly_entries').select('*');

// Query 3: feedback (line 54-56) — espera Query 2 terminar
const { data: feedbackData } = await supabase.from('weekly_feedback').select('*');

// Query 4: config (line 74-78) — espera Query 3 terminar
const { data: configData } = await supabase.from('app_config').select('value').eq('key', 'current_week').single();
```

As 4 queries são independentes mas executam em cascata. Se cada uma leva 200ms, o usuário espera 800ms+ desnecessariamente.

**Expected:**

```typescript
const [usersRes, entriesRes, feedbackRes, configRes] = await Promise.all([
  supabase.from('app_users').select('*').order('name'),
  supabase.from('weekly_entries').select('*'),
  supabase.from('weekly_feedback').select('*'),
  supabase.from('app_config').select('value').eq('key', 'current_week').single(),
]);

const usersData = usersRes.data;
const entriesData = entriesRes.data;
const feedbackData = feedbackRes.data;
const configData = configRes.data;
```

**Verification:**

- [ ] As 4 queries executam em paralelo (verificar via Network tab do browser)
- [ ] O tempo total de carregamento de dados reduz de ~800ms para ~200ms
- [ ] Todos os dados continuam carregando corretamente
- [ ] Testes existentes continuam passando: `npm test`

**Status:** [ ] Fixed

---

### 2. [CRITICAL] Zero React.lazy() / Suspense — todos os componentes carregados eagerly

**Issue ID:** FIX-PERF-002

**Location:** `App.tsx:3-9`

**Problem:**

```typescript
import Login from './components/Login';
import ChangePassword from './components/ChangePassword';
import ChangePasswordModal from './components/ChangePasswordModal';
import Dashboard from './components/Dashboard';
import CheckIn from './components/CheckIn';
```

Todos os componentes são importados eagerly. Um Contributor que só precisa de Login + CheckIn baixa e parseia Dashboard (28KB), AdminPanel (24KB), OneOnOne (16KB) com recharts.

**Expected:**

```typescript
import { lazy, Suspense } from 'react';
import Login from './components/Login';
import CheckIn from './components/CheckIn';

const Dashboard = lazy(() => import('./components/Dashboard'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const OneOnOne = lazy(() => import('./components/OneOnOne'));
const ChangePassword = lazy(() => import('./components/ChangePassword'));
const ChangePasswordModal = lazy(() => import('./components/ChangePasswordModal'));
```

E envolver os componentes lazy com `<Suspense>`:

```typescript
<Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary" /><p className="ml-3 text-text-secondary">Carregando...</p></div>}>
  {/* componentes lazy aqui */}
</Suspense>
```

**Verification:**

- [ ] Build gera múltiplos chunks em `dist/assets/` (não apenas 1 arquivo JS)
- [ ] Network tab mostra chunks carregados sob demanda ao navegar
- [ ] Login carrega sem baixar código do Dashboard
- [ ] Todos os fluxos de navegação funcionam normalmente

**Status:** [ ] Fixed

---

### 3. [CRITICAL] Bundle monolítico de 794 KB sem code splitting

**Issue ID:** FIX-PERF-003

**Location:** `vite.config.ts:6-17`

**Problem:**

```typescript
export default defineConfig({
  server: { port: 3000, host: '0.0.0.0' },
  plugins: [tailwindcss(), react()],
  resolve: { alias: { '@': path.resolve(__dirname, '.') } }
});
```

Zero configuração de build. Um único arquivo JS de 794 KB contendo React, Supabase, recharts, d3, lucide-react e todo o código da aplicação.

**Expected:**

```typescript
export default defineConfig({
  server: { port: 3000, host: '0.0.0.0' },
  plugins: [tailwindcss(), react()],
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          charts: ['recharts'],
        }
      }
    }
  }
});
```

**Verification:**

- [ ] `npm run build` gera múltiplos chunks em `dist/assets/`
- [ ] Chunk principal reduz de 794 KB para < 300 KB
- [ ] Vendor chunks são cacheados separadamente pelo browser
- [ ] App carrega corretamente em produção após deploy

**Status:** [ ] Fixed

---

### 4. [CRITICAL] Auth check bloqueia UI inteira — "telas não avançam"

**Issue ID:** FIX-PERF-004

**Location:** `App.tsx:42-101, 183-192`

**Problem:**

```typescript
// Linha 42-52: onAuthStateChange faz query adicional
const { data: appUser } = await supabase
  .from('app_users')
  .select('*')
  .or(`auth_id.eq.${authId},email.eq.${authEmail}`)
  .single();

// Linha 183-192: Spinner bloqueia TODA a UI até auth + data carregarem
if (authLoading || loading) {
  return (
    <div className="...">
      <div className="... animate-spin" />
      <p>Carregando dados...</p>
    </div>
  );
}
```

O usuário vê apenas um spinner até que AMBOS auth check E useAppState completem. Causa direta do sintoma "telas não avançam".

**Expected:**

1. Usar `supabase.auth.getSession()` para check rápido inicial
2. Se não há sessão cached, mostrar Login IMEDIATAMENTE (sem spinner)
3. Se há sessão, mostrar skeleton/spinner APENAS durante o data loading
4. Desacoplar authLoading de data loading:

```typescript
// Check rápido de sessão
if (authLoading) {
  return <LoadingSpinner />;
}

// Sem sessão = Login imediato (sem esperar data)
if (!user) {
  return <Login onLogin={handleLogin} />;
}

// Com sessão = pode mostrar skeleton enquanto data carrega
if (loading) {
  return <DashboardSkeleton />;
}
```

**Verification:**

- [ ] Sem sessão: Login aparece em < 500ms (sem spinner prolongado)
- [ ] Com sessão: UI mostra feedback visual imediato
- [ ] Auth check não bloqueia exibição do Login para usuários não autenticados
- [ ] Fluxo de login continua funcionando normalmente

**Status:** [ ] Fixed

---

### 5. [HIGH] recharts (8.4 MB) carregado para TODOS os usuários

**Issue ID:** FIX-PERF-005

**Location:** `components/OneOnOne.tsx:5`

**Problem:**

```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
```

`recharts` puxa todo o ecossistema d3. Usado APENAS no OneOnOne.tsx (view de Partners). Todos os Contributors baixam ~200-300 KB de código de gráficos que nunca usarão.

**Expected:**

Resolvido automaticamente pelo Fix FIX-PERF-002 (React.lazy no OneOnOne). Verificar que o chunk de recharts é separado após FIX-PERF-003.

**Verification:**

- [ ] OneOnOne.tsx carrega em chunk separado (lazy)
- [ ] Contributors NÃO baixam recharts no login/check-in
- [ ] Gráficos do OneOnOne funcionam quando Partners acessam a view

**Status:** [ ] Fixed

---

### 6. [HIGH] Fetch de TODOS os dados sem filtro por usuário

**Issue ID:** FIX-PERF-006

**Location:** `hooks/useAppState.ts:36-38`

**Problem:**

```typescript
const { data: entriesData } = await supabase.from('weekly_entries').select('*');
const { data: feedbackData } = await supabase.from('weekly_feedback').select('*');
```

Queries buscam TODOS os registros de TODOS os usuários. Um Contributor baixa dados desnecessários de todos os 7+ usuários.

**Expected:**

```typescript
// Para Contributors: filtrar apenas seus dados
if (currentUser.role === 'contributor') {
  const { data: entriesData } = await supabase
    .from('weekly_entries')
    .select('*')
    .eq('user_id', currentUser.id);
  const { data: feedbackData } = await supabase
    .from('weekly_feedback')
    .select('*')
    .eq('user_id', currentUser.id);
} else {
  // Partners precisam dos dados de todos
  const { data: entriesData } = await supabase.from('weekly_entries').select('*');
  const { data: feedbackData } = await supabase.from('weekly_feedback').select('*');
}
```

**Verification:**

- [ ] Contributor logado recebe apenas seus próprios dados
- [ ] Partner logado continua recebendo dados de todos os usuários
- [ ] Payload do Supabase reduz significativamente para Contributors
- [ ] Dashboard e CheckIn continuam exibindo dados corretamente

**Status:** [ ] Fixed

---

### 7. [HIGH] lucide-react — 30 ícones across 7 arquivos no bundle inicial

**Issue ID:** FIX-PERF-007

**Location:** Múltiplos arquivos (Dashboard.tsx, CheckIn.tsx, Login.tsx, AdminPanel.tsx, OneOnOne.tsx, ChangePassword.tsx, ChangePasswordModal.tsx)

**Problem:**

~30 ícones únicos importados de `lucide-react` (44 MB on disk). Sem code splitting, todos estão no bundle inicial.

**Expected:**

Resolvido automaticamente pelos Fixes FIX-PERF-002 e FIX-PERF-003. Ícones de componentes lazy-loaded não entrarão no bundle inicial.

**Verification:**

- [ ] Após implementar lazy loading, ícones de Dashboard/AdminPanel/OneOnOne não estão no chunk inicial
- [ ] Ícones do Login e CheckIn continuam disponíveis imediatamente

**Status:** [ ] Fixed

---

### 8. [MEDIUM] Sem build.target ou compressão no Vite config

**Issue ID:** FIX-PERF-008

**Location:** `vite.config.ts`

**Problem:**

Sem `build.target` definido, Vite pode gerar código subótimo para browsers mais antigos (comum em Windows corporativo).

**Expected:**

Incluído no Fix FIX-PERF-003 — adicionar `target: 'es2020'` na seção `build`.

**Verification:**

- [ ] `build.target` definido como `es2020`
- [ ] Build completa sem erros

**Status:** [ ] Fixed

---

### 9. [MEDIUM] generateMockEntries() roda no module load time

**Issue ID:** FIX-PERF-009

**Location:** `constants.tsx:192-229`

**Problem:**

```typescript
export const INITIAL_STATE: AppState = {
  users: MOCK_USERS,
  entries: generateMockEntries(), // Executa síncronamente no import
  feedback: {},
  currentWeek: INITIAL_WEEK
};
```

`generateMockEntries()` itera sobre todos os MOCK_USERS, todas as semanas, todas as métricas com Math.random(). Executa no import time antes do app renderizar.

**Expected:**

```typescript
export const INITIAL_STATE: AppState = {
  users: MOCK_USERS,
  entries: {},
  feedback: {},
  currentWeek: INITIAL_WEEK
};
```

Dados reais vêm do Supabase. Mock data não é necessário no INITIAL_STATE.

**Verification:**

- [ ] `INITIAL_STATE.entries` é `{}` (objeto vazio)
- [ ] App continua funcionando normalmente com dados do Supabase
- [ ] Nenhum erro quando Supabase retorna dados reais

**Status:** [ ] Fixed

---

### 10. [MEDIUM] getWeeklyHighlights() sem useMemo — recalcula a cada render

**Issue ID:** FIX-PERF-010

**Location:** `components/Dashboard.tsx:390`

**Problem:**

```typescript
{(() => {
  const highlights = getWeeklyHighlights(appState.users, appState.entries, 2);
  // ...renders highlights
})()}
```

IIFE dentro do JSX recalcula em cada render. Itera sobre todos os users, chama `calculateMetricStatus()` para cada métrica (que itera sobre todas as entries), ordena e filtra.

**Expected:**

```typescript
const highlights = useMemo(
  () => getWeeklyHighlights(appState.users, appState.entries, 2),
  [appState.users, appState.entries]
);
```

E usar `highlights` diretamente no JSX.

**Verification:**

- [ ] `useMemo` importado de React
- [ ] `getWeeklyHighlights` computado apenas quando `appState.users` ou `appState.entries` mudam
- [ ] Destaques semanais continuam exibindo corretamente no Dashboard

**Status:** [ ] Fixed

---

### 11. [MEDIUM] Dashboard table sem virtualização

**Issue ID:** FIX-PERF-011

**Location:** `components/Dashboard.tsx:199-276`

**Problem:**

Tabela renderiza ~136 células (7 users x ~1.5 metrics x 13 weeks), cada com `onClick` handler e `calculateWeeklyValue()` dentro do render loop.

**Expected:**

Considerar `useMemo` para os valores calculados da tabela. Virtualização (react-window) é opcional para este tamanho de dataset, mas os valores calculados devem ser memoizados.

**Verification:**

- [ ] Valores da tabela calculados com `useMemo`
- [ ] Interações na tabela (click, hover) permanecem responsivas

**Status:** [ ] Fixed

---

### 12. [LOW] Avatares externos sem loading="lazy"

**Issue ID:** FIX-PERF-012

**Location:** `constants.tsx` (linhas 11, 29, 49, etc.)

**Problem:**

```typescript
avatar: 'https://picsum.photos/seed/rafael/150/150',
```

Avatares de picsum.photos carregam imediatamente, sem `loading="lazy"` nos `<img>` tags, causando requests adicionais no carregamento inicial.

**Expected:**

Nos componentes que renderizam avatares, adicionar `loading="lazy"` e dimensões explícitas:

```tsx
<img src={user.avatar} alt={user.name} loading="lazy" width={40} height={40} />
```

**Verification:**

- [ ] Tags `<img>` de avatar possuem `loading="lazy"`
- [ ] Avatares carregam sob demanda ao scrollar
- [ ] Layout não sofre shift ao carregar avatares

**Status:** [ ] Fixed

---

### 13. [LOW] Sem Error Boundary — falha do Supabase mata o app inteiro

**Issue ID:** FIX-PERF-013

**Location:** `App.tsx`

**Problem:**

Nenhum React Error Boundary existe no app. Se qualquer query do Supabase falhar ou lançar erro inesperado, o app inteiro crasheia para tela branca sem recuperação.

**Expected:**

Criar um `ErrorBoundary` component e envolver o App:

```typescript
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen">
          <p className="text-lg text-red-400">Algo deu errado</p>
          <button onClick={() => window.location.reload()}>Recarregar</button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

**Verification:**

- [ ] Error Boundary component criado
- [ ] App envolto com Error Boundary
- [ ] Erro simulado mostra tela amigável (não tela branca)
- [ ] Botão "Recarregar" funciona

**Status:** [ ] Fixed

---

## Constraints

**CRITICAL: @dev must follow these constraints:**

- [ ] Fix ONLY the issues listed above
- [ ] Do NOT add new features
- [ ] Do NOT refactor unrelated code
- [ ] Run all tests before marking complete: `npm test`
- [ ] Run linting before marking complete: `npm run lint`
- [ ] Run type check before marking complete: `npm run typecheck`
- [ ] Rebuild and verify in produção: `npm run build`
- [ ] Deploy e verificar em https://desempenho.ordusdigital.com.br

---

## After Fixing

1. Mark each issue as fixed in this document
2. Run `npm run build` and verify bundle sizes
3. Deploy to Vercel and verify performance em produção
4. Request QA re-review: `@qa *review performance`

---

## Estimated Impact

| Fix Priority | Issues | Estimated Time | Performance Gain |
|-------------|--------|---------------|-----------------|
| P0 (First) | FIX-PERF-001 | 5 min | Waterfall 800ms → 200ms |
| P1 | FIX-PERF-002 + 003 | 25 min | Bundle 794KB → ~300KB inicial |
| P2 | FIX-PERF-004 | 10 min | Login aparece em < 500ms |
| P3 | FIX-PERF-006 | 5 min | Payload reduzido para Contributors |
| P4 | FIX-PERF-009 + 010 | 10 min | Render mais rápido |
| P5 | FIX-PERF-011 + 012 + 013 | 15 min | Melhorias gerais |

**Total estimado: ~70 min para todos os fixes**
**Fixes P0-P2 (40 min) resolvem ~70% do problema reportado**

---

_Generated by Quinn (Test Architect) - AIOX QA System_
