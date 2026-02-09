import { Metric, MetricType, WeeklyData } from '../types';

export const calculateMetricStatus = (metric: Metric, entries: WeeklyData[]) => {
  // Filter entries for this specific metric
  const metricEntries = entries.filter(e => e.inputs.metricId === metric.id);

  if (metricEntries.length === 0) return { value: 0, status: 'gray' };

  let calculatedValue = 0;

  switch (metric.type) {
    case MetricType.PERCENTAGE_CUMULATIVE: {
      let total = 0;
      let success = 0;
      // We need to know which input key corresponds to 'total' vs 'success'. 
      // Convention: First input is total/denominator, second is success/numerator usually.
      // Or broadly: input[0] is denominator, input[1] is numerator.
      // Let's infer from the data structure for this specific app
      metricEntries.forEach(entry => {
        const values = Object.values(entry.inputs).filter(v => typeof v === 'number');
        if (values.length >= 2) {
            // Assuming first key defined in constants was "total", second was "part"
            // But Object.values order isn't guaranteed. Let's rely on the config order.
            const totalKey = metric.inputs[0].key;
            const successKey = metric.inputs[1].key;
            total += (entry.inputs[totalKey] as number || 0);
            success += (entry.inputs[successKey] as number || 0);
        }
      });
      calculatedValue = total === 0 ? 0 : (success / total) * 100;
      break;
    }
    case MetricType.SUM_TARGET: {
      metricEntries.forEach(entry => {
         const valKey = metric.inputs[0].key;
         calculatedValue += (entry.inputs[valKey] as number || 0);
      });
      break;
    }
    case MetricType.PERCENTAGE_AVERAGE: {
      let sum = 0;
      metricEntries.forEach(entry => {
         const valKey = metric.inputs[0].key;
         sum += (entry.inputs[valKey] as number || 0);
      });
      calculatedValue = sum / metricEntries.length;
      break;
    }
    case MetricType.MAX_LIMIT: {
       let sum = 0;
       metricEntries.forEach(entry => {
          const valKey = metric.inputs[0].key;
          sum += (entry.inputs[valKey] as number || 0);
       });
       calculatedValue = sum / metricEntries.length; // Average days
       break;
    }
  }

  // Determine Color
  let status = 'gray';
  
  // Logic for comparison
  if (metric.type === MetricType.MAX_LIMIT) {
     // Lower is better
     if (calculatedValue <= metric.targetValue) status = 'green';
     else if (calculatedValue <= metric.targetValue * 1.2) status = 'yellow';
     else status = 'red';
  } else if (metric.type === MetricType.SUM_TARGET) {
      // Logic: Are we on track given the current week?
      // Ideal pace: Target / 13 weeks.
      // Current expected: (Target / 13) * max_week_recorded
      const maxWeek = Math.max(...metricEntries.map(e => e.week), 1);
      const expectedProgress = (metric.targetValue / 13) * maxWeek;
      
      if (calculatedValue >= expectedProgress * 0.9) status = 'green';
      else if (calculatedValue >= expectedProgress * 0.7) status = 'yellow';
      else status = 'red';
  } else {
      // Percentage / Standard Higher is Better
      if (calculatedValue >= metric.targetValue) status = 'green';
      else if (calculatedValue >= metric.targetValue * 0.8) status = 'yellow'; // 80% of target
      else status = 'red';
  }

  return { value: calculatedValue, status };
};

export const getStatusColor = (status: string) => {
    switch(status) {
        case 'green': return 'bg-emerald-500';
        case 'yellow': return 'bg-amber-400';
        case 'red': return 'bg-rose-500';
        default: return 'bg-slate-200';
    }
}