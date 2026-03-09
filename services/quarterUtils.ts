/**
 * Quarter configuration utilities.
 * Calculates total weeks, current week, and progress based on start/end dates.
 */

export interface QuarterConfig {
  startDate: string; // ISO date string: "2026-01-01"
  endDate: string;   // ISO date string: "2026-03-31"
}

export interface QuarterInfo {
  startDate: string;
  endDate: string;
  totalWeeks: number;
  currentWeek: number;
  progressPercent: number;
  isActive: boolean;
}

/**
 * Calculate total weeks between two dates.
 * Uses ceiling to ensure partial weeks count as full weeks.
 */
export const calculateTotalWeeks = (startDate: string, endDate: string): number => {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T23:59:59');
  const diffMs = end.getTime() - start.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return Math.ceil(diffDays / 7);
};

/**
 * Calculate which week number we're currently in.
 * Returns 0 if before start, totalWeeks if after end.
 */
export const calculateCurrentWeek = (startDate: string, endDate: string): number => {
  const now = new Date();
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T23:59:59');
  const totalWeeks = calculateTotalWeeks(startDate, endDate);

  if (now < start) return 0;
  if (now > end) return totalWeeks;

  const diffMs = now.getTime() - start.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  const week = Math.floor(diffDays / 7) + 1;

  return Math.min(week, totalWeeks);
};

/**
 * Build full QuarterInfo from config dates.
 */
export const getQuarterInfo = (config: QuarterConfig): QuarterInfo => {
  const totalWeeks = calculateTotalWeeks(config.startDate, config.endDate);
  const currentWeek = calculateCurrentWeek(config.startDate, config.endDate);
  const now = new Date();
  const start = new Date(config.startDate + 'T00:00:00');
  const end = new Date(config.endDate + 'T23:59:59');

  return {
    startDate: config.startDate,
    endDate: config.endDate,
    totalWeeks,
    currentWeek,
    progressPercent: totalWeeks > 0 ? Math.round((currentWeek / totalWeeks) * 100) : 0,
    isActive: now >= start && now <= end,
  };
};

/**
 * Default quarter config: Q1 2026 (Jan 1 - Mar 31).
 */
export const DEFAULT_QUARTER_CONFIG: QuarterConfig = {
  startDate: '2026-01-01',
  endDate: '2026-03-31',
};

/**
 * Format a date string for display in pt-BR.
 */
export const formatDateBR = (dateStr: string): string => {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};
