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
  Dot,
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

const LineChart = React.memo(function LineChart({ data, height = 300 }: LineChartProps) {
  const { dataPoints, config } = data;

  // Add safety zone data (80% of goal)
  const dataWithSafetyZone = dataPoints.map(point => ({
    ...point,
    safetyZone: point.goal * 0.8,
  }));

  // Calculate trend line if enabled
  const trendData = React.useMemo(() => {
    if (!config.show_trend_line) return [];
    
    const n = dataWithSafetyZone.length;
    if (n < 2) return [];
    
    // Linear regression calculation
    const sumX = dataWithSafetyZone.reduce((sum, _, i) => sum + i, 0);
    const sumY = dataWithSafetyZone.reduce((sum, point) => sum + point.totalSpent, 0);
    const sumXY = dataWithSafetyZone.reduce((sum, point, i) => sum + (i * point.totalSpent), 0);
    const sumXX = dataWithSafetyZone.reduce((sum, _, i) => sum + (i * i), 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return dataWithSafetyZone.map((point, i) => ({
      ...point,
      trendValue: slope * i + intercept,
    }));
  }, [dataWithSafetyZone, config.show_trend_line]);

  // Find min and max values for highlighting
  const { minPoint, maxPoint } = React.useMemo(() => {
    if (!config.highlight_min_max) return { minPoint: null, maxPoint: null };
    
    const values = dataWithSafetyZone.map(point => point.totalSpent);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    
    const minPoint = dataWithSafetyZone.find(point => point.totalSpent === minValue);
    const maxPoint = dataWithSafetyZone.find(point => point.totalSpent === maxValue);
    
    return { minPoint, maxPoint };
  }, [dataWithSafetyZone, config.highlight_min_max]);

  // Custom dot component for min/max highlighting
  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    
    if (config.highlight_min_max) {
      if (payload === minPoint) {
        return <Dot cx={cx} cy={cy} r={6} fill="#22c55e" stroke="#22c55e" strokeWidth={2} />;
      }
      if (payload === maxPoint) {
        return <Dot cx={cx} cy={cy} r={6} fill="#ef4444" stroke="#ef4444" strokeWidth={2} />;
      }
    }
    
    return <Dot cx={cx} cy={cy} r={4} fill={config.color} stroke={config.color} strokeWidth={2} />;
  };

  // Custom label component for showing values on points
  const CustomLabel = (props: any) => {
    const { x, y, value } = props;
    if (!config.show_values_on_points) return null;
    
    return (
      <text 
        x={x} 
        y={y - 10} 
        fill={config.color} 
        textAnchor="middle" 
        fontSize={11}
        fontWeight="500"
      >
        {formatCurrency(value).replace(',00', '')}
      </text>
    );
  };

  const chartData = config.show_trend_line ? trendData : dataWithSafetyZone;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={chartData} margin={{ top: 20, right: 5, left: 5, bottom: 5 }}>
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
        
        {/* Goal reference line - thinner and more visible */}
        <ReferenceLine 
          y={config.monthly_goal} 
          stroke={config.color} 
          strokeDasharray="8 4"
          strokeWidth={1.5}
          opacity={0.7}
        />
        
        {/* Trend line if enabled */}
        {config.show_trend_line && (
          <Line
            type="monotone"
            dataKey="trendValue"
            stroke={config.color}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            opacity={0.6}
          />
        )}
        
        {/* Actual spending line */}
        <Line
          type="monotone"
          dataKey="totalSpent"
          stroke={config.color}
          strokeWidth={3}
          dot={config.highlight_min_max ? <CustomDot /> : { fill: config.color, strokeWidth: 2, r: 4 }}
          label={config.show_values_on_points ? <CustomLabel /> : false}
          activeDot={{ r: 6, stroke: config.color, strokeWidth: 2 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
});

export default LineChart;