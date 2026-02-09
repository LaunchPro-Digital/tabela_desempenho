import { AppState, MetricType, User, UserRole } from './types';

export const INITIAL_WEEK = 4; // Simulating we are in week 4

export const MOCK_USERS: User[] = [
  {
    id: 'u1',
    name: 'Rafael',
    role: UserRole.CONTRIBUTOR,
    roleTitle: 'Tráfego Pago',
    password: '123',
    avatar: 'https://picsum.photos/seed/rafael/150/150',
    metrics: [
      {
        id: 'm_rafael_1',
        title: 'Contas com CPA reduzido',
        targetValue: 60,
        unit: '%',
        type: MetricType.PERCENTAGE_CUMULATIVE,
        inputs: [
          { key: 'total_accounts', label: 'Em quantas contas você trabalhou esta semana?', type: 'number' },
          { key: 'reduced_accounts', label: 'Quantas tiveram redução clara de CPA?', type: 'number' }
        ]
      }
    ]
  },
  {
    id: 'u2',
    name: 'Kauã',
    role: UserRole.CONTRIBUTOR,
    roleTitle: 'Automação & IA',
    password: '123',
    avatar: 'https://picsum.photos/seed/kaua/150/150',
    metrics: [
      {
        id: 'm_kaua_1',
        title: 'Demandas atendidas em < 48h',
        targetValue: 90,
        unit: '%',
        type: MetricType.PERCENTAGE_CUMULATIVE,
        inputs: [
          { key: 'total_demands', label: 'Quantas demandas você recebeu/finalizou?', type: 'number' },
          { key: 'fast_demands', label: 'Quantas foram resolvidas em menos de 48h úteis?', type: 'number' }
        ]
      }
    ]
  },
  {
    id: 'u3',
    name: 'Kevin',
    role: UserRole.CONTRIBUTOR,
    roleTitle: 'Design & Edição',
    password: '123',
    avatar: 'https://picsum.photos/seed/kevin/150/150',
    metrics: [
      {
        id: 'm_kevin_1',
        title: 'Entregas dentro do prazo',
        targetValue: 90,
        unit: '%',
        type: MetricType.PERCENTAGE_CUMULATIVE,
        inputs: [
          { key: 'total_deliveries', label: 'Total de entregas realizadas', type: 'number' },
          { key: 'on_time_deliveries', label: 'Quantas foram entregues no prazo estipulado?', type: 'number' }
        ]
      }
    ]
  },
  {
    id: 'u7',
    name: 'Arthur',
    role: UserRole.CONTRIBUTOR,
    roleTitle: 'Copywriter',
    password: '123',
    avatar: 'https://picsum.photos/seed/arthur/150/150',
    metrics: [
        {
            id: 'm_arthur_1',
            title: 'Qualidade Copy (Aprovadas 1ª)',
            targetValue: 80,
            unit: '%',
            type: MetricType.PERCENTAGE_CUMULATIVE,
            inputs: [
                { key: 'total_copies', label: 'Copys entregues', type: 'number'},
                { key: 'approved_copies', label: 'Aprovadas sem refação', type: 'number'}
            ]
        }
    ]
  },
  {
    id: 'u4',
    name: 'Leandro',
    role: UserRole.PARTNER,
    roleTitle: 'Sócio / Comercial',
    password: 'admin',
    avatar: 'https://picsum.photos/seed/leandro/150/150',
    metrics: [
      {
        id: 'm_leandro_1',
        title: 'Auditorias pagas agendadas',
        targetValue: 12,
        unit: 'un',
        type: MetricType.SUM_TARGET,
        inputs: [
          { key: 'audits_scheduled', label: 'Novas auditorias pagas agendadas', type: 'number' }
        ]
      },
      {
        id: 'm_leandro_2',
        title: 'Conversão Auditoria -> CORE',
        targetValue: 25,
        unit: '%',
        type: MetricType.PERCENTAGE_CUMULATIVE,
        inputs: [
          { key: 'audits_performed', label: 'Auditorias realizadas', type: 'number' },
          { key: 'core_closed', label: 'Vendas de CORE fechadas', type: 'number' }
        ]
      },
      {
        id: 'm_leandro_3',
        title: 'Conteúdos Publicados',
        targetValue: 35, // 3 per week approx
        unit: 'un',
        type: MetricType.SUM_TARGET,
        inputs: [
          { key: 'content_count', label: 'Conteúdos publicados (YT+LI+IG)', type: 'number' }
        ]
      }
    ]
  },
  {
    id: 'u5',
    name: 'Joel',
    role: UserRole.PARTNER,
    roleTitle: 'Sócio / Financeiro / SDR',
    password: 'admin',
    avatar: 'https://picsum.photos/seed/joel/150/150',
    metrics: [
      {
        id: 'm_joel_1',
        title: 'Taxa de Aceite Diagnóstico',
        targetValue: 60,
        unit: '%',
        type: MetricType.PERCENTAGE_CUMULATIVE,
        inputs: [
          { key: 'contacts_made', label: 'Contatos realizados', type: 'number' },
          { key: 'diagnostics_accepted', label: 'Diagnósticos aceitos', type: 'number' }
        ]
      },
      {
        id: 'm_joel_2',
        title: 'Contas da empresa em dia',
        targetValue: 95,
        unit: '%',
        type: MetricType.PERCENTAGE_AVERAGE,
        inputs: [
          { key: 'on_time_percentage', label: '% de contas pagas sem atraso esta semana', type: 'number' }
        ]
      }
    ]
  },
  {
    id: 'u6',
    name: 'Adriano',
    role: UserRole.PARTNER,
    roleTitle: 'Sócio / PM / CS',
    password: 'admin',
    avatar: 'https://picsum.photos/seed/adriano/150/150',
    metrics: [
      {
        id: 'm_adriano_1',
        title: 'Projetos no prazo',
        targetValue: 90,
        unit: '%',
        type: MetricType.PERCENTAGE_CUMULATIVE,
        inputs: [
          { key: 'total_projects', label: 'Projetos ativos/entregues', type: 'number' },
          { key: 'on_track_projects', label: 'Projetos dentro do cronograma', type: 'number' }
        ]
      },
      {
        id: 'm_adriano_2',
        title: 'NPS Médio',
        targetValue: 8,
        unit: 'pts',
        type: MetricType.PERCENTAGE_AVERAGE,
        inputs: [
          { key: 'current_nps', label: 'NPS medido esta semana', type: 'number' }
        ]
      }
    ]
  }
];

// Helper to generate some dummy historical data
const generateMockEntries = () => {
  const entries: Record<string, any[]> = {};
  MOCK_USERS.forEach(user => {
    // Generate data for weeks 1-3
    const userEntries = [];
    for (let w = 1; w < 4; w++) {
      user.metrics.forEach(metric => {
        const inputData: any = { metricId: metric.id };
        metric.inputs.forEach(inp => {
          // Randomized realistic data
          if (metric.type === MetricType.PERCENTAGE_CUMULATIVE) {
             const base = Math.floor(Math.random() * 10) + 1;
             inputData[inp.key] = inp.key.includes('total') ? base : Math.floor(base * (Math.random() * 0.5 + 0.4));
          } else if (metric.type === MetricType.SUM_TARGET) {
             inputData[inp.key] = Math.floor(Math.random() * 3);
          } else {
             inputData[inp.key] = 8 + Math.floor(Math.random() * 2);
          }
        });
        
        userEntries.push({
            week: w,
            inputs: inputData,
            calculatedValue: 0, // Calculated on fly in component usually, but stored here for simplicity
            timestamp: new Date().toISOString()
        });
      });
    }
    entries[user.id] = userEntries;
  });
  return entries;
};

export const INITIAL_STATE: AppState = {
  users: MOCK_USERS,
  entries: generateMockEntries(),
  feedback: {},
  currentWeek: INITIAL_WEEK
};