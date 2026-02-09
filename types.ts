
export enum UserRole {
  PARTNER = 'PARTNER',
  CONTRIBUTOR = 'CONTRIBUTOR'
}

export enum MetricType {
  PERCENTAGE_CUMULATIVE = 'PERCENTAGE_CUMULATIVE', // e.g., CPA reduction (sum of successes / sum of attempts)
  PERCENTAGE_AVERAGE = 'PERCENTAGE_AVERAGE', // e.g., NPS (avg of weekly scores)
  SUM_TARGET = 'SUM_TARGET', // e.g., 12 Sales (sum of weekly sales)
  MAX_LIMIT = 'MAX_LIMIT', // e.g., Decision time < 7 days
}

export interface MetricInputConfig {
  key: string;
  label: string;
  type: 'number';
  placeholder?: string;
}

export interface Metric {
  id: string;
  title: string;
  targetValue: number;
  type: MetricType;
  unit: string;
  description?: string;
  inputs: MetricInputConfig[]; // Configuration for the form questions
}

export interface WeeklyData {
  week: number;
  inputs: Record<string, any>; // Maps input key to value
  calculatedValue: number;
  timestamp: string;
}

export interface Feedback {
  week: number;
  blockers?: string; // "Principais motivos pelos quais não foi possível ser melhor"
  commitment?: string; // "O que se compromete a fazer"
  learning?: string; // "Principal aprendizado"
  commitmentCompleted?: boolean;
  timestamp?: string; // Date string for display "Segunda-feira 09/02/26 14h27"
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatar: string;
  roleTitle: string;
  metrics: Metric[];
  password?: string; // New field for access control
}

export interface AppState {
  users: User[];
  entries: Record<string, WeeklyData[]>; // userId -> data
  feedback: Record<string, Feedback[]>; // userId -> feedback
  currentWeek: number;
}
