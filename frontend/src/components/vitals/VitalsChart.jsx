import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

const thresholds = {
  BP: { systolic: 140, diastolic: 90 },
  SUGAR: { primary: 126 },
  PULSE: { low: 50, high: 110 },
  SPO2: { low: 92 },
};

const VitalsChart = ({ data = [], type }) => {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-50 text-center">
        <p className="text-sm text-gray-400">No readings to display. Log a vital to see the trend chart.</p>
      </div>
    );
  }

  // Sort chronologically for chart
  const sorted = [...data].sort((a, b) => new Date(a.recordedAt) - new Date(b.recordedAt));

  const chartData = sorted.map((v) => ({
    date: new Date(v.recordedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    primary: v.valuePrimary,
    secondary: v.valueSecondary,
    fullDate: new Date(v.recordedAt).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    }),
  }));

  const threshold = thresholds[type];
  const isBP = type === 'BP';

  return (
    <motion.div
      className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} />
          <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
          <Tooltip
            contentStyle={{
              borderRadius: '12px',
              border: 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              fontSize: '13px',
            }}
            formatter={(value, name) => {
              const label = name === 'primary'
                ? (isBP ? 'Systolic' : type)
                : 'Diastolic';
              return [value, label];
            }}
            labelFormatter={(label, payload) => payload?.[0]?.payload?.fullDate || label}
          />

          <Line
            type="monotone"
            dataKey="primary"
            stroke="#F5A623"
            strokeWidth={2.5}
            dot={{ fill: '#F5A623', r: 4 }}
            activeDot={{ r: 6, fill: '#E8920F' }}
          />

          {isBP && (
            <Line
              type="monotone"
              dataKey="secondary"
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ fill: '#6366f1', r: 3 }}
              activeDot={{ r: 5 }}
              strokeDasharray="5 5"
            />
          )}

          {/* Threshold reference lines */}
          {threshold?.systolic && (
            <ReferenceLine y={threshold.systolic} stroke="#ef4444" strokeDasharray="4 4" label={{ value: '140', fill: '#ef4444', fontSize: 10 }} />
          )}
          {threshold?.diastolic && isBP && (
            <ReferenceLine y={threshold.diastolic} stroke="#a78bfa" strokeDasharray="4 4" label={{ value: '90', fill: '#a78bfa', fontSize: 10 }} />
          )}
          {threshold?.primary && (
            <ReferenceLine y={threshold.primary} stroke="#ef4444" strokeDasharray="4 4" label={{ value: String(threshold.primary), fill: '#ef4444', fontSize: 10 }} />
          )}
          {threshold?.high && (
            <ReferenceLine y={threshold.high} stroke="#ef4444" strokeDasharray="4 4" label={{ value: String(threshold.high), fill: '#ef4444', fontSize: 10 }} />
          )}
          {threshold?.low && (
            <ReferenceLine y={threshold.low} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: String(threshold.low), fill: '#f59e0b', fontSize: 10 }} />
          )}
        </LineChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-primary inline-block rounded" />
          {isBP ? 'Systolic' : type}
        </span>
        {isBP && (
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-indigo-400 inline-block rounded" style={{ borderBottom: '1px dashed' }} />
            Diastolic
          </span>
        )}
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-red-400 inline-block rounded" style={{ borderBottom: '1px dashed' }} />
          Threshold
        </span>
      </div>
    </motion.div>
  );
};

export default VitalsChart;
