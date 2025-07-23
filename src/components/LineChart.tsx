import React from 'react';
import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Area,
  ComposedChart,
} from 'recharts';
import { formatCurrency } from '@/utils/chartUtils';
import type { ChartData } from '@/types/chart';

interface LineChartProps {
  data: ChartData;
  height?: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">
          Gasto: <span className="font-medium text-foreground">{formatCurrency(data.totalSpent)}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          Meta: <span className="font-medium text-foreground">{formatCurrency(data.goal)}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          Transações: <span className="font-medium text-foreground">{data.transactionCount}</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function LineChart({ data, height = 300 }: LineChartProps) {
  const { dataPoints, config } = data;

  // Add safety zone data (80% of goal)
  const dataWithSafetyZone = dataPoints.map(point => ({
    ...point,
    safetyZone: point.goal * 0.8,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={dataWithSafetyZone} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis 
          dataKey="month" 
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
        />
        <YAxis 
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickFormatter={(value) => formatCurrency(value).replace('R$', 'R$').replace(',00', '')}
        />
        <Tooltip content={<CustomTooltip />} />
        
        {/* Safety zone area (up to 80% of goal) */}
        <Area
          type="monotone"
          dataKey="safetyZone"
          stroke="none"
          fill={config.color}
          fillOpacity={0.1}
        />
        
        {/* Goal reference line */}
        <ReferenceLine 
          y={config.monthly_goal} 
          stroke="hsl(var(--muted-foreground))" 
          strokeDasharray="5 5"
          strokeWidth={2}
        />
        
        {/* Actual spending line */}
        <Line
          type="monotone"
          dataKey="totalSpent"
          stroke={config.color}
          strokeWidth={3}
          dot={{ fill: config.color, strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: config.color, strokeWidth: 2 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}