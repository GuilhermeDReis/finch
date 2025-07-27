import React from 'react';
import {
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import { formatCurrency } from '@/utils/chartUtils';
import type { ChartData } from '@/types/chart';

interface PieChartProps {
  data: ChartData;
  height?: number;
}

const COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#F97316', // Orange
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#EC4899', // Pink
  '#6B7280', // Gray
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium">{data.name}</p>
        <p className="text-sm text-muted-foreground">
          Valor: <span className="font-medium text-foreground">{formatCurrency(data.value)}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          Percentual: <span className="font-medium text-foreground">{data.payload.percentage}%</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function PieChart({ data, height = 300 }: PieChartProps) {
  // Transform data for pie chart
  // For now, we'll create mock distribution data based on the chart config
  const pieData = [
    { name: 'Alimentação', value: 1200, percentage: 40 },
    { name: 'Transporte', value: 800, percentage: 27 },
    { name: 'Lazer', value: 600, percentage: 20 },
    { name: 'Outros', value: 400, percentage: 13 },
  ];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPieChart>
        <Pie
          data={pieData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percentage }) => `${name}: ${percentage}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {pieData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend />
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}
