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
import { useCharts } from '@/contexts/ChartContext';
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
          Percentual: <span className="font-medium text-foreground">{data.payload.percentage.toFixed(1)}%</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function PieChart({ data, height = 300 }: PieChartProps) {
  const { allCategories, allSubcategories } = useCharts();

  // Transform data for pie chart using real data from dataPoints
  const pieData = React.useMemo(() => {
    if (!data.dataPoints || data.dataPoints.length === 0) {
      return [];
    }

    // Calculate total for percentage calculation
    const total = data.dataPoints.reduce((sum, point) => sum + point.totalSpent, 0);
    
    if (total === 0) {
      return [];
    }

    // Map dataPoints to pie chart format
    return data.dataPoints
      .filter(point => point.totalSpent > 0) // Only include items with value
      .map((point) => {
        let name = 'Desconhecido';
        
        // Get the name based on the context
        if (data.config.category_id) {
          // When a category is specified, we're showing subcategories
          const subcategory = allSubcategories.find(sub => sub.id === point.month);
          name = subcategory?.name || 'Subcategoria não encontrada';
        } else {
          // When no category is specified, we're showing categories
          const category = allCategories.find(cat => cat.id === point.month);
          name = category?.name || 'Categoria não encontrada';
        }

        const percentage = (point.totalSpent / total) * 100;

        return {
          name,
          value: point.totalSpent,
          percentage,
          transactionCount: point.transactionCount
        };
      })
      .sort((a, b) => b.value - a.value); // Sort by value descending
  }, [data.dataPoints, data.config.grouping_type, allCategories, allSubcategories]);

  // Show message if no data
  if (pieData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-muted-foreground">
          <p className="text-sm">Nenhum dado encontrado</p>
          <p className="text-xs mt-1">
            Não há transações para o período e categoria selecionados
          </p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPieChart margin={{ bottom: 20 }}>
        <Pie
          data={pieData}
          cx="50%"
          cy="45%"
          labelLine={false}
          label={false}
          outerRadius={60}
          innerRadius={0}
          fill="#8884d8"
          dataKey="value"
          paddingAngle={2}
        >
          {pieData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend 
          layout="horizontal" 
          verticalAlign="bottom" 
          align="center"
          iconSize={10}
          wrapperStyle={{
            fontSize: '12px',
            lineHeight: '1.4',
            paddingTop: '10px'
          }}
        />
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}
