import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';

const LiveAnalyticsSection = ({ data, auditLogs = [], searchTerm = '', onSearch = () => {} }) => {
  const { churnTrend, segmentDistribution, retentionImpact } = data;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0f1712] border border-[#2a4230] p-3 rounded-none shadow-2xl backdrop-blur-md">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm font-bold" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toFixed(1)}%
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 h-full overflow-y-auto custom-scrollbar p-8">
      {/* Top Row: Main Trend */}
      <div className="bg-[#0f1712]/80 backdrop-blur-md border border-[#1a281e] rounded-none p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-8 h-[1px] bg-[#c5f82a]/50"></div>
        <div className="absolute top-0 left-0 w-[1px] h-8 bg-[#c5f82a]/50"></div>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-white">Live Churn Propensity Trend</h3>
            <p className="text-xs text-gray-500">Real-time aggregate risk monitoring across all active segments</p>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-none bg-[#f87171] shadow-[0_0_8px_#f87171]"></div>
              <span className="text-[10px] text-gray-400 font-bold uppercase">Avg Risk</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-none bg-[#c5f82a] shadow-[0_0_8px_#c5f82a]"></div>
              <span className="text-[10px] text-gray-400 font-bold uppercase">Retention Rate</span>
            </div>
          </div>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={churnTrend}>
              <defs>
                <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f87171" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f87171" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorRetention" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#c5f82a" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#c5f82a" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a281e" vertical={false} />
              <XAxis 
                dataKey="time" 
                stroke="#475569" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
              />
              <YAxis 
                stroke="#475569" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="risk" 
                name="Risk"
                stroke="#f87171" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorRisk)" 
                animationDuration={1500}
              />
              <Area 
                type="monotone" 
                dataKey="retention" 
                name="Retention"
                stroke="#c5f82a" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorRetention)" 
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Middle Row: Distribution & Impact */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#0f1712]/80 backdrop-blur-md border border-[#1a281e] rounded-none p-6 shadow-xl relative overflow-hidden" role="region" aria-label="Churn Propensity Trend Chart">
          <div className="absolute bottom-0 right-0 w-8 h-[1px] bg-[#c5f82a]/20"></div>
          <div className="absolute bottom-0 right-0 w-[1px] h-8 bg-[#c5f82a]/20"></div>
          <h3 className="text-sm font-bold text-gray-200 mb-6 uppercase tracking-wider">Customer Segment Health</h3>
          <div className="h-[250px] w-full flex" role="img" aria-label="Pie chart showing customer segment distribution">
            <ResponsiveContainer width="60%" height="100%">
              <PieChart>
                <Pie
                  data={segmentDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  animationBegin={200}
                  animationDuration={1000}
                >
                  {segmentDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 flex flex-col justify-center gap-4 pl-4">
              {segmentDistribution.map((seg, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-none" style={{ backgroundColor: seg.color }}></div>
                    <span className="text-xs text-gray-400 font-medium">{seg.name}</span>
                  </div>
                  <span className="text-xs text-white font-bold">{seg.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-[#0f1712]/80 backdrop-blur-md border border-[#1a281e] rounded-none p-6 shadow-xl" role="region" aria-label="Agent Performance Bar Chart">
          <h3 className="text-sm font-bold text-gray-200 mb-6 uppercase tracking-wider">Agent Retention Performance</h3>
          <div className="h-[250px] w-full" role="img" aria-label="Bar chart showing cases prevented vs lost by AI agents">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={retentionImpact}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a281e" vertical={false} />
                <XAxis dataKey="day" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: '#ffffff05' }}
                  contentStyle={{ backgroundColor: '#0f1712', border: '1px solid #2a4230', borderRadius: '0px' }}
                />
                <Bar dataKey="prevented" name="Prevented" fill="#c5f82a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="lost" name="Lost" fill="#334155" radius={[0, 0, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>


    </div>
  );
};

export default LiveAnalyticsSection;
