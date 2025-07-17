import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  Legend
} from 'recharts';
import { ParsedDebugData } from '../../../../utils/teamBalancing/debugLogParser';

interface BalanceAnalysisDashboardProps {
  data: ParsedDebugData;
}

export const BalanceAnalysisDashboard: React.FC<BalanceAnalysisDashboardProps> = ({ data }) => {
  const [viewMode, setViewMode] = useState<'radar' | 'bars' | 'gauge'>('radar');

  // Prepare radar chart data
  const radarData = data.balanceBreakdown.metrics.map(metric => ({
    metric: metric.name,
    blue: metric.blueValue,
    orange: metric.orangeValue,
    max: Math.max(metric.blueValue, metric.orangeValue) * 1.1
  }));

  // Calculate balance score quality
  const getBalanceQuality = (score: number) => {
    if (score < 0.5) return { label: 'Excellent', color: '#10b981' };
    if (score < 1.0) return { label: 'Good', color: '#22c55e' };
    if (score < 1.5) return { label: 'Fair', color: '#eab308' };
    if (score < 2.0) return { label: 'Poor', color: '#f59e0b' };
    return { label: 'Very Poor', color: '#ef4444' };
  };

  const quality = getBalanceQuality(data.balanceBreakdown.overallBalance);

  // Gauge visualization component
  const BalanceGauge = () => {
    const score = data.balanceBreakdown.overallBalance;
    const maxScore = 3;
    const angle = (score / maxScore) * 180;

    return (
      <div className="relative w-64 h-32 mx-auto">
        <svg viewBox="0 0 200 100" className="w-full h-full">
          {/* Background arc */}
          <path
            d="M 10 90 A 80 80 0 0 1 190 90"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="20"
            strokeLinecap="round"
          />
          
          {/* Score arc */}
          <motion.path
            d="M 10 90 A 80 80 0 0 1 190 90"
            fill="none"
            stroke={quality.color}
            strokeWidth="20"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: angle / 180 }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
          
          {/* Needle */}
          <motion.line
            x1="100"
            y1="90"
            x2="100"
            y2="20"
            stroke="#374151"
            strokeWidth="3"
            initial={{ rotate: -90 }}
            animate={{ rotate: angle - 90 }}
            style={{ transformOrigin: '100px 90px' }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
          
          {/* Center dot */}
          <circle cx="100" cy="90" r="5" fill="#374151" />
        </svg>
        
        {/* Score display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-3xl font-bold">{score.toFixed(3)}</div>
          <div className="text-sm" style={{ color: quality.color }}>{quality.label}</div>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-base-100 rounded-lg shadow-lg p-6"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h2 className="text-xl font-bold mb-4 md:mb-0">Balance Analysis</h2>
        <div className="flex gap-2">
          <button
            className={`btn btn-sm ${viewMode === 'radar' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setViewMode('radar')}
          >
            Radar Chart
          </button>
          <button
            className={`btn btn-sm ${viewMode === 'bars' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setViewMode('bars')}
          >
            Bar Chart
          </button>
          <button
            className={`btn btn-sm ${viewMode === 'gauge' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setViewMode('gauge')}
          >
            Balance Gauge
          </button>
        </div>
      </div>

      {/* View modes */}
      {viewMode === 'radar' && (
        <div className="space-y-6">
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid strokeDasharray="3 3" />
                <PolarAngleAxis dataKey="metric" />
                <PolarRadiusAxis angle={90} domain={[0, 'dataMax']} />
                <Radar
                  name="Blue Team"
                  dataKey="blue"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.3}
                />
                <Radar
                  name="Orange Team"
                  dataKey="orange"
                  stroke="#f97316"
                  fill="#f97316"
                  fillOpacity={0.3}
                />
                <Legend />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Team advantages */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-700 mb-2">Blue Team Advantages</h4>
              <ul className="space-y-1 text-sm">
                {data.balanceBreakdown.metrics
                  .filter(m => m.blueValue > m.orangeValue)
                  .map(m => (
                    <li key={m.name} className="flex justify-between">
                      <span>{m.name}</span>
                      <span className="font-medium">+{Math.abs(m.difference).toFixed(2)}</span>
                    </li>
                  ))}
              </ul>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <h4 className="font-medium text-orange-700 mb-2">Orange Team Advantages</h4>
              <ul className="space-y-1 text-sm">
                {data.balanceBreakdown.metrics
                  .filter(m => m.orangeValue > m.blueValue)
                  .map(m => (
                    <li key={m.name} className="flex justify-between">
                      <span>{m.name}</span>
                      <span className="font-medium">+{Math.abs(m.difference).toFixed(2)}</span>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'bars' && (
        <div className="space-y-6">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.balanceBreakdown.metrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="blueValue" name="Blue Team" fill="#3b82f6" />
                <Bar dataKey="orangeValue" name="Orange Team" fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Difference chart */}
          <div>
            <h4 className="font-medium mb-2">Metric Differences</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.balanceBreakdown.metrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="difference" name="Difference">
                    {data.balanceBreakdown.metrics.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.difference < 0.5 ? '#10b981' : entry.difference < 1.0 ? '#eab308' : '#ef4444'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'gauge' && (
        <div className="space-y-6">
          <BalanceGauge />
          
          {/* Detailed metrics */}
          <div className="overflow-x-auto">
            <table className="table table-compact w-full">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th className="text-blue-600">Blue Team</th>
                  <th className="text-orange-600">Orange Team</th>
                  <th>Difference</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.balanceBreakdown.metrics.map((metric, index) => (
                  <tr key={index}>
                    <td className="font-medium">{metric.name}</td>
                    <td className="text-blue-600">{metric.blueValue.toFixed(2)}</td>
                    <td className="text-orange-600">{metric.orangeValue.toFixed(2)}</td>
                    <td className={metric.difference < 0.5 ? 'text-success' : metric.difference < 1.0 ? 'text-warning' : 'text-error'}>
                      {metric.difference.toFixed(2)}
                    </td>
                    <td>
                      <span className={`badge badge-sm ${
                        metric.difference < 0.5 ? 'badge-success' : 
                        metric.difference < 1.0 ? 'badge-warning' : 
                        'badge-error'
                      }`}>
                        {metric.difference < 0.5 ? 'Balanced' : 
                         metric.difference < 1.0 ? 'Fair' : 
                         'Imbalanced'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Overall assessment */}
          <div className="bg-base-200 p-4 rounded-lg text-center">
            <h4 className="font-bold mb-2">Overall Assessment</h4>
            <p className="text-2xl font-bold mb-2" style={{ color: quality.color }}>
              {data.balanceBreakdown.description}
            </p>
            <p className="text-sm text-gray-500">
              {data.executiveSummary.advantage}
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
};