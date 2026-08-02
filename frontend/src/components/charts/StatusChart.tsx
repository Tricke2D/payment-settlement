import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface StatusChartProps {
    data: {
        pending: { count: number; amount: number };
        completed: { count: number; amount: number };
        failed: { count: number; amount: number };
    };
}

const COLORS = ['#F59E0B', '#10B981', '#EF4444'];

const StatusChart: React.FC<StatusChartProps> = ({ data }) => {
    const chartData = [
        { name: 'Pending', value: data.pending.count, amount: data.pending.amount },
        { name: 'Completed', value: data.completed.count, amount: data.completed.amount },
        { name: 'Failed', value: data.failed.count, amount: data.failed.amount },
    ];

    return (
        <ResponsiveContainer width="100%" height={250}>
            <PieChart>
                <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                >
                    {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip formatter={(value, name, props) => [`${props.payload.amount}`, name]} />
                <Legend />
            </PieChart>
        </ResponsiveContainer>
    );
};

export default StatusChart;