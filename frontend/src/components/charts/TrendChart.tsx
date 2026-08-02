import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface TrendChartProps {
    data: any[];
}

const TrendChart: React.FC<TrendChartProps> = ({ data }) => {
    return (
        <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="amount" stroke="#3B82F6" name="Total Amount" />
            </LineChart>
        </ResponsiveContainer>
    );
};

export default TrendChart;