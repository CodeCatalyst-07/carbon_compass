/* eslint-disable react-refresh/only-export-components */
import { cn } from '../../lib/cn';

export interface BarChartItem {
  label: string;
  value: number;
  percentage: number;
  colorClass: string;
}

interface BarChartProps {
  items: BarChartItem[];
  unit: string;
  title: string;
  className?: string;
}

/** Category → color class mapping. */
export const CATEGORY_COLORS: Record<string, string> = {
  transport: 'bg-accent-cyan',
  electricity: 'bg-warning',
  diet: 'bg-primary',
  flights: 'bg-accent-orange',
};

/**
 * Horizontal bar chart with accessible table alternative.
 *
 * Renders category breakdown as proportional bars with text labels
 * and percentages. Color is NEVER the only differentiator — every bar
 * has a text label and numeric value alongside.
 *
 * Screen readers get a hidden <table> with the same data.
 */
export function BarChart({ items, unit, title, className }: BarChartProps) {
  const maxValue = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className={cn('flex flex-col gap-lg', className)}>
      {/* Visual chart */}
      <div className="flex flex-col gap-md" role="img" aria-label={title} aria-hidden="true">
        {items.map((item) => (
          <div key={item.label} className="flex flex-col gap-xs">
            <div className="flex justify-between items-baseline gap-sm">
              <span className="text-sm font-semibold text-ink truncate">{item.label}</span>
              <span className="text-sm text-body whitespace-nowrap">
                {item.value < 1 && item.value > 0
                  ? `${(item.value * 1000).toFixed(0)} g`
                  : `${item.value.toFixed(1)} ${unit}`}{' '}
                ({item.percentage.toFixed(1)}%)
              </span>
            </div>
            <div className="h-3 w-full rounded-pill bg-canvas-soft overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-pill transition-all duration-500 ease-out',
                  item.colorClass,
                )}
                style={{
                  width: `${Math.max((item.value / maxValue) * 100, item.value > 0 ? 2 : 0)}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Accessible table alternative — visible to screen readers */}
      <table className="sr-only" style={{ tableLayout: 'fixed', width: '1px' }}>
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Category</th>
            <th scope="col">Annual emissions ({unit})</th>
            <th scope="col">Share of total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.label}>
              <td>{item.label}</td>
              <td>
                {item.value.toFixed(1)} {unit}
              </td>
              <td>{item.percentage.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
