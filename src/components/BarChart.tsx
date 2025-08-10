import React from 'react';
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { formatCurrency } from '@/utils/chartUtils';
import type { ChartData } from '@/types/chart';

interface BarChartProps {
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
          Valor: <span className="font-medium text-foreground">{formatCurrency(data.totalSpent)}</span>
        </p>
        {data.goal && (
          <p className="text-sm text-muted-foreground">
            Meta: <span className="font-medium text-foreground">{formatCurrency(data.goal)}</span>
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Transações: <span className="font-medium text-foreground">{data.transactionCount}</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function BarChart({ data, height = 300 }: BarChartProps) {
  const { dataPoints, config } = data;

  // Verificar se há dados para exibir
  const hasData = dataPoints && dataPoints.length > 0 && dataPoints.some(point => point.totalSpent > 0);

  if (!hasData) {
    return (
      <div 
        className="flex items-center justify-center text-muted-foreground"
        style={{ height }}
      >
        <p className="text-sm">Nenhum valor encontrado</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={dataPoints} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
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
        
        {/* Goal reference line */}
        {config.monthly_goal > 0 && (
          <ReferenceLine 
            y={config.monthly_goal} 
            stroke={config.color} 
            strokeDasharray="8 4"
            strokeWidth={1.5}
            opacity={0.7}
          />
        )}
        
        {/* Bars */}
        <Bar
          dataKey="totalSpent"
          fill={config.color}
          radius={[4, 4, 0, 0]}
        />
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
