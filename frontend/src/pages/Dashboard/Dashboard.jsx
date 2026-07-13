import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ForceGraph2D from 'react-force-graph-2d';
import { FixedSizeList } from 'react-window';
import {
  Globe, Activity, Share2, BarChart2, AlertOctagon,
  Bell, Settings, X, ArrowRight, Menu, Wifi, User, Search, Users, LogOut, Shield, Layout, Download,
  Building2, ChevronRight, Briefcase
} from 'lucide-react';

import SpecialistDashboard from './SpecialistDashboard';
import { useDashboardData } from '../../hooks/useDashboardData';
import LiveAnalyticsSection from '../../components/dashboard/LiveAnalyticsSection';
import { AIReasoningPanel } from '../../components/dashboard/AIReasoningPanel';
import {
  KPICard, DonutChart, BarChart, Heatmap, ModelCard, FeatureImportance,
  EscalationCard, EscalationDetailsModal, ChainOfThoughtTerminal,
  ActivityKPICard, LiveEventCard, WorkflowChainOverlay, BrandLogo
} from '../../components/dashboard/DashboardComponents';

const Dashboard = ({ isAdminView = false }) => {
  const navigate = useNavigate();
  const {
    kpis, auditLogs, liveEvents, isPipelineRunning, terminalText, nodeData,
    escalations, setEscalations, claimedEscalations, setClaimedEscalations, isSearching, analyticsData, opsLogs,
    runPipeline, handleManualSearch, setTriggerAction, refreshData, logout, claimEscalation,
    workspaces, activeWorkspace, setActiveWorkspace
  } = useDashboardData();

  const handleClaim = async (id) => {
    const claimedCase = await claimEscalation(id);
    if (claimedCase) {
      setActiveSpecialistCase(claimedCase);
      setSelectedEscalation(null); // Close modal if open
    }
  };

  const user = JSON.parse(localStorage.getItem('sre_user') || '{}');
  const displayName = isAdminView ? user.username : 'Guest Specialist';

  const [activeTab, setActiveTab] = useState('Activity');
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoverNode, setHoverNode] = useState(null);
  const [activeNodeId, setActiveNodeId] = useState(null);
  const [isFullView, setIsFullView] = useState(false);
  const [activeSpecialistCase, setActiveSpecialistCase] = useState(null);
  const [notification, setNotification] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedEscalation, setSelectedEscalation] = useState(null);
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'High Risk Alert', message: 'Customer CUST-8821 showing 94% churn propensity', time: '2m ago', type: 'error', read: false },
    { id: 2, title: 'System Healthy', message: 'Neural pipeline processing at optimal latency (14ms)', time: '15m ago', type: 'success', read: true },
    { id: 3, title: 'New Escalation', message: 'Agentic AI handoff triggered for user_002', time: '1h ago', type: 'info', read: true },
  ]);
  const [searchId, setSearchId] = useState('');
  const [escalationSearch, setEscalationSearch] = useState('');
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [activityDimensions, setActivityDimensions] = useState({ width: 0, height: 0 });
  const [pipelineGraphData, setPipelineGraphData] = useState({ nodes: [], links: [] });
  const [activitySearchId, setActivitySearchId] = useState('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNetworkStatusOpen, setIsNetworkStatusOpen] = useState(false);
  const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false);
  const [auditSearchTerm, setAuditSearchTerm] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [selectedChainId, setSelectedChainId] = useState(null);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [aiReasoningEntity, setAiReasoningEntity] = useState(null);

  const containerRef = useRef();
  const graphRef = useRef();
  const activityContainerRef = useRef();
  const eventsContainerRef = useRef();
  const [eventsDimensions, setEventsDimensions] = useState({ width: 0, height: 0 });

  const filteredEscalations = useMemo(() => {
    if (!escalationSearch) return escalations;
    const term = escalationSearch.toLowerCase();
    return escalations.filter(e => 
      (e.id && e.id.toLowerCase().includes(term)) || 
      (e.reason && e.reason.toLowerCase().includes(term)) ||
      (e.userId && e.userId.toLowerCase().includes(term))
    );
  }, [escalations, escalationSearch]);

  const triggerAction = (msg) => {
    setNotification(msg);
    if (msg.toLowerCase().includes('escalation')) {
      setNotifications(prev => [{
        id: Date.now(),
        title: 'New Escalation',
        message: msg,
        time: 'Just now',
        type: 'error',
        read: false
      }, ...prev].slice(0, 5));
    }
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    setTriggerAction(triggerAction);
  }, [setTriggerAction]);

  const chainEvents = useMemo(() => {
    if (!selectedChainId) return [];
    return liveEvents.filter(e => e.chainId === selectedChainId);
  }, [liveEvents, selectedChainId]);

  const handleEventClick = (chainId) => {
    setSelectedChainId(chainId);
    setIsTimelineOpen(true);
  };

  const openAIReasoning = (entity) => setAiReasoningEntity(entity);

  const exportToCSV = (data, filename) => {
    if (!data || !data.length) {
      triggerAction('No data available to export');
      return;
    }
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => Object.values(obj).join(',')).join('\n');
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerAction(`Exported ${filename} successfully`);
  };

  useEffect(() => {
    fetch('/pipeline_graph.json')
      .then(res => res.json())
      .then(data => {
        if (data.nodes && data.links) {
          setPipelineGraphData(data);
        }
      })
      .catch(err => console.error("Error loading pipeline graph data:", err));
  }, []);

  useEffect(() => {
    if (activeTab === 'Pipeline') {
      setIsFullView(true);
    } else {
      setIsFullView(false);
    }
    // Close all menus when tab changes
    setIsUserMenuOpen(false);
    setIsNetworkStatusOpen(false);
    setIsCommandMenuOpen(false);
  }, [activeTab]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect;
        setDimensions({ width, height });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [activeTab, isFullView]);

  useEffect(() => {
    if (!activityContainerRef.current) return;
    const observer = new ResizeObserver(entries => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect;
        setActivityDimensions({ width, height });
      }
    });
    observer.observe(activityContainerRef.current);
    return () => observer.disconnect();
  }, [activeTab]);

  useEffect(() => {
    if (!eventsContainerRef.current) return;
    const observer = new ResizeObserver(entries => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect;
        setEventsDimensions({ width, height });
      }
    });
    observer.observe(eventsContainerRef.current);
    return () => observer.disconnect();
  }, [activeTab]);

  const activityNodeCanvasObject = useMemo(() => (node, ctx, globalScale) => {
    const size = (node.val || 5) * 3;
    const isActive = node.id === activeNodeId;

    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);

    if (isActive) {
      ctx.fillStyle = '#c5f82a';
      ctx.shadowColor = '#c5f82a';
      ctx.shadowBlur = 15;
    } else {
      ctx.fillStyle = '#2a4230';
      ctx.shadowBlur = 0;
    }

    ctx.fill();

    if (isActive) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2 / globalScale;
      ctx.stroke();
    }

    const safeScale = Math.max(globalScale, 0.1);
    const fontSize = 8 / safeScale;
    ctx.font = `${fontSize}px "Plus Jakarta Sans", Sans-Serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = isActive ? '#ffffff' : '#4c6b35';
    ctx.fillText(node.name || node.id, node.x, node.y + size + fontSize + 2);
  }, [activeNodeId]);

  const pipelineNodeCanvasObject = useMemo(() => (node, ctx, globalScale) => {
    const label = node.name || node.id;
    const isHovered = node === hoverNode;
    const isSelected = node.id === selectedNode?.id;
    const isActive = node.id === activeNodeId;
    const size = (node.val || 5) * 4;

    if (isActive) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, size * 1.5, 0, 2 * Math.PI, false);
      const gradient = ctx.createRadialGradient(node.x, node.y, size * 0.5, node.x, node.y, size * 1.5);
      gradient.addColorStop(0, 'rgba(197, 248, 42, 0.4)');
      gradient.addColorStop(1, 'rgba(197, 248, 42, 0)');
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);

    if (isActive) {
      ctx.fillStyle = '#c5f82a';
      ctx.shadowColor = '#c5f82a';
      ctx.shadowBlur = 25;
    } else if (isSelected) {
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 15;
    } else {
      ctx.fillStyle = '#1a2d21';
      ctx.shadowBlur = 0;
    }

    ctx.fill();

    const safeScale = Math.max(globalScale, 0.1);
    ctx.strokeStyle = isActive ? '#ffffff' : (isSelected || isHovered ? '#c5f82a' : '#2a4230');
    ctx.lineWidth = (isActive || isSelected) ? 3 / safeScale : 1.5 / safeScale;
    ctx.stroke();

    const fontSize = (isActive ? 14 : 11) / safeScale;
    ctx.font = `${isActive ? 'bold' : 'normal'} ${fontSize}px "Plus Jakarta Sans", Sans-Serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isActive ? '#000000' : (isSelected || isHovered ? '#c5f82a' : '#4c6b35');
    ctx.fillText(label, node.x, node.y);
  }, [hoverNode, selectedNode, activeNodeId]);

  const navItems = [
    { name: 'Executive Overview', icon: Globe, id: 'Activity' },
    { name: 'Neural Topology', icon: Share2, id: 'Pipeline' },
    { name: 'Observability', icon: Activity, id: 'Analytics' },
    { name: 'Action Center', icon: AlertOctagon, id: 'Escalations' },
  ];

  return (
    <div className="h-screen flex flex-col bg-[#050505] text-[#e1e8e2] font-sans selection:bg-[#c5f82a]/30 relative overflow-hidden">
      {/* Cyber-SOC HUD Overlays */}
      <div className="hud-grid" />
      <div className="hud-scanline" />
      
      {/* System Status Ticker */}
      <div className="h-6 bg-cyber-primary/5 border-b border-cyber-primary/20 flex items-center px-4 overflow-hidden relative z-50">
        <div className="flex gap-8 animate-marquee whitespace-nowrap text-[9px] font-black tracking-widest text-cyber-primary/60">
          <span>SYSTEM_STATUS: OPTIMAL</span>
          <span>NEURAL_LATENCY: 14MS</span>
          <span>ACTIVE_PIPELINES: 12</span>
          <span>THREAT_LEVEL: LOW</span>
          <span>ORCHESTRATOR_UPTIME: 99.98%</span>
          <span className="text-cyber-alert">ALERT: CUST-8821 RISK_SPIKE_DETECTED</span>
          <span>GEOGRAPHIC_LOAD: BALANCED</span>
          <span>INTEGRITY_CHECK: PASS</span>
        </div>
      </div>

      <div 
        className="absolute inset-0 opacity-10 bg-cover bg-center mix-blend-overlay pointer-events-none" 
        style={{backgroundImage: "url('https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?q=80&w=2000')"}}
      />
      <div className="absolute inset-0 bg-[#050505]/95 pointer-events-none" />
      
      <div className={`flex w-full h-full relative z-10 transition-all duration-500 ${isFullView ? 'p-0' : 'p-4 md:p-6 lg:p-8'}`}>
        <div className="w-24 flex flex-col items-center pt-8 shrink-0 animate-in fade-in slide-in-from-left-4 duration-500 border-r-2 border-cyber-primary/20 bg-[#080808] z-20 shadow-[8px_0_32px_rgba(0,0,0,0.8)] relative">
          <div className="absolute inset-y-0 right-0 w-[1px] bg-cyber-primary/5" />
          <Link to="/" className="mb-8 hover:opacity-80 transition-opacity">
            <BrandLogo isSidebar={true} />
          </Link>
          


          <div className="flex flex-col gap-8 items-center">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex flex-col items-center gap-2 transition-all group ${isActive ? 'text-cyber-primary' : 'text-zinc-600 hover:text-zinc-400'}`}
                >
                  <div className={`w-12 h-12 flex items-center justify-center transition-all border ${isActive ? 'bg-cyber-primary text-cyber-black border-cyber-primary shadow-[0_0_20px_rgba(197,248,42,0.4)]' : 'bg-transparent border-zinc-800 group-hover:border-zinc-600'}`}>
                    <Icon size={20} />
                  </div>
                  <span className="text-[8px] uppercase font-black tracking-[0.2em] font-display text-center leading-tight mt-1">{item.name}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-auto flex flex-col gap-6 items-center pb-4">
            {!isAdminView ? (
              <button 
                onClick={() => navigate('/admin/login')}
                className="flex flex-col items-center gap-1 group cursor-pointer hover:opacity-80 transition-all"
                title="Login as Admin"
              >
                <div className="w-10 h-10 border border-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-cyber-primary group-hover:border-cyber-primary/50 transition-all">
                  <User size={18} />
                </div>
                <span className="text-[7px] uppercase font-black text-zinc-700 truncate max-w-[60px] font-display">{displayName}</span>
              </button>
            ) : (
              <div className="flex flex-col items-center gap-1 group">
                <div className="w-10 h-10 border border-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-cyber-primary transition-all">
                  <User size={18} />
                </div>
                <span className="text-[7px] uppercase font-black text-zinc-700 truncate max-w-[60px] font-display">{displayName}</span>
              </div>
            )}
            
            {isAdminView && (
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => navigate('/admin/management')}
                  className="w-10 h-10 border border-cyber-primary/20 flex items-center justify-center text-cyber-primary hover:bg-cyber-primary hover:text-cyber-black transition-all shadow-lg"
                  title="Admin Management"
                >
                  <Layout size={18} />
                </button>
                <button
                  onClick={logout}
                  className="w-10 h-10 border border-red-500/20 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-lg"
                  title="Logout"
                >
                  <LogOut size={18} />
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className={`flex-1 flex flex-col min-w-0 ${isFullView ? 'pl-6' : 'pl-10 lg:pl-12'}`}>
          {activeTab === 'Activity' && (
            <div className="flex flex-col h-full bg-[#070c08]/80 backdrop-blur-xl border border-cyber-border/50 rounded-2xl shadow-2xl relative overflow-hidden">
              <div className="p-8 pb-4 shrink-0 border-b border-cyber-border/30 bg-[#0a120d]/80">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded border"
                        style={{ color: activeWorkspace?.color, borderColor: `${activeWorkspace?.color}40`, backgroundColor: `${activeWorkspace?.color}10` }}>
                        {activeWorkspace?.name}
                      </span>
                    </div>
                    <h1 className="text-2xl font-black text-white uppercase tracking-tighter font-display">Executive Revenue Intelligence</h1>
                    <p className="text-xs text-gray-500 tracking-wider uppercase font-bold mt-1">Real-time business outcomes and retention impact</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyber-primary/10 border border-cyber-primary/20">
                      <div className="w-2 h-2 bg-cyber-primary rounded-full animate-pulse"></div>
                      <span className="text-[10px] text-cyber-primary font-black uppercase tracking-widest font-display">System Optimal</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                  <ActivityKPICard title="REVENUE AT RISK" value={kpis?.revenue_at_risk || '$1.24M'} />
                  <ActivityKPICard title="REVENUE PROTECTED" value={kpis?.revenue_protected || '$840K'} />
                  <ActivityKPICard title="CUSTOMERS SAVED" value={(kpis?.customers_saved || 142).toLocaleString()} />
                  <ActivityKPICard title="RETENTION ROI" value={kpis?.retention_roi || '312%'} />
                  <ActivityKPICard title="CHURN REDUCTION" value={kpis?.churn_reduction || '14%'} />
                  <ActivityKPICard title="HIGH-RISK ACCOUNTS" value={(kpis?.high_risk_accounts || 42).toLocaleString()} hasTrend={false} />
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-hidden">
                <LiveAnalyticsSection 
                  data={analyticsData} 
                  auditLogs={auditLogs} 
                  searchTerm={auditSearchTerm} 
                  onSearch={setAuditSearchTerm} 
                />
              </div>
            </div>
          )}

          {activeTab === 'Pipeline' && (
            <div className={`flex flex-col flex-1 h-full min-h-0 relative`}>
              <div className={`flex-1 transition-all duration-700 ease-in-out relative overflow-hidden flex shadow-2xl ${isFullView ? 'bg-black h-full w-full' : 'bg-cyber-black border border-cyber-border shadow-brutalist'}`}>
                <div className="absolute top-8 left-8 z-50 flex gap-3">
                  <span className="text-[10px] font-bold tracking-widest uppercase px-4 py-2 border animate-in zoom-in-50 duration-300 font-display"
                    style={{ color: activeWorkspace?.color, borderColor: `${activeWorkspace?.color}40`, backgroundColor: `${activeWorkspace?.color}10`, boxShadow: `0 0 15px ${activeWorkspace?.color}20` }}>
                    {activeWorkspace?.name}
                  </span>
                  <div className="px-4 py-2 bg-cyber-primary text-cyber-black font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-[0_0_20px_rgba(197,248,42,0.4)] animate-in zoom-in-50 duration-300 font-display">
                    <div className="w-2 h-2 bg-cyber-black rounded-full animate-pulse"></div>
                    Live Pipeline Environment
                  </div>
                </div>

                <div className="flex-1 relative h-full w-full" ref={containerRef}>
                  {pipelineGraphData.nodes.length > 0 && dimensions.width > 0 ? (
                    <ForceGraph2D
                      ref={graphRef}
                      graphData={pipelineGraphData}
                      width={dimensions.width}
                      height={dimensions.height}
                      nodeRelSize={8}
                      backgroundColor="rgba(0,0,0,0)"
                      linkColor={() => '#1f3826'}
                      linkOpacity={0.6}
                      linkWidth={2}
                      linkDirectionalParticles={4}
                      linkDirectionalParticleSpeed={0.005}
                      onNodeHover={setHoverNode}
                      onNodeClick={node => setSelectedNode(node)}
                      nodeCanvasObject={pipelineNodeCanvasObject}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-[#2a4230]">
                      <Share2 className="animate-pulse" size={48} />
                    </div>
                  )}
                  {!isFullView && <div className="absolute inset-0 pointer-events-none rounded-[2rem] shadow-[inset_0_0_100px_rgba(4,10,6,0.9)]" />}
                </div>
                
                {selectedNode && (
                  <div className="absolute top-6 right-6 w-72 bg-[#0d140f]/98 backdrop-blur-3xl border border-cyber-primary/20 rounded-2xl flex flex-col text-gray-300 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden z-10 animate-in slide-in-from-right-8 duration-300 max-h-[85%]">
                    <div className="p-5 flex-1 overflow-y-auto custom-scrollbar">
                      <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold text-white font-display uppercase tracking-tight">Node Details</h2>
                        <button onClick={() => setSelectedNode(null)} className="text-gray-500 hover:text-white transition-colors">
                          <X size={18} />
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-3 mb-2">
                        <span className="bg-[#c5f82a]/10 text-[#c5f82a] text-[10px] px-2 py-0.5 rounded border border-[#c5f82a]/20 font-mono uppercase tracking-wider">
                          {nodeData[selectedNode.id]?.status || 'Idle'}
                        </span>
                        <h3 className="text-xl font-bold text-white truncate font-display" title={selectedNode.name || selectedNode.id}>{selectedNode.name || selectedNode.id}</h3>
                      </div>
                      
                      <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-4 font-display">
                        Last Active: <span className="text-gray-400 font-mono tracking-tighter">{nodeData[selectedNode.id]?.timestamp || 'Never'}</span>
                      </div>

                      {nodeData[selectedNode.id] ? (
                        <div className="space-y-6">
                          {nodeData[selectedNode.id].reasoning && (
                            <div>
                              <div className="text-[10px] text-[#c5f82a] uppercase tracking-widest font-bold mb-2 font-display">Agent Reasoning</div>
                              <div className="bg-[#050806] border border-[#1a281e] rounded-xl p-3 text-xs leading-relaxed text-gray-300 italic">
                                "{nodeData[selectedNode.id].reasoning}"
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-3">
                            {nodeData[selectedNode.id].risk_score !== undefined && (
                              <div className="bg-[#17241c] border border-[#233529] p-3 rounded-xl">
                                <div className="text-[9px] text-gray-500 uppercase font-bold mb-1 font-display">Risk Score</div>
                                <div className="text-[#c5f82a] font-bold font-mono">{(nodeData[selectedNode.id].risk_score * 100).toFixed(1)}%</div>
                              </div>
                            )}
                             {nodeData[selectedNode.id].driver && (
                              <div className="bg-[#17241c] border border-[#233529] p-3 rounded-xl">
                                <div className="text-[9px] text-gray-500 uppercase font-bold mb-1 font-display">Risk Driver</div>
                                <div className="text-white font-bold">{nodeData[selectedNode.id].driver}</div>
                              </div>
                            )}
                          </div>

                          {nodeData[selectedNode.id].offer && (
                            <div>
                              <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2 font-display">Generated Offer</div>
                              <div className="bg-[#c5f82a]/5 border border-[#c5f82a]/20 rounded-xl p-3 text-xs text-[#c5f82a] font-semibold font-display italic">
                                {nodeData[selectedNode.id].offer}
                              </div>
                            </div>
                          )}

                          {nodeData[selectedNode.id].action && (
                            <div>
                              <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2 font-display">Final Action</div>
                              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-xs text-blue-400 font-bold font-display uppercase tracking-wider">
                                {nodeData[selectedNode.id].action}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="py-10 text-center flex flex-col items-center gap-3 opacity-40">
                          <Activity size={32} />
                          <div className="text-[10px] uppercase tracking-widest font-bold">Waiting for execution data...</div>
                        </div>
                      )}

                      <div className="mt-8 pt-6 border-t border-[#1a281e]">
                        <div className="text-[10px] text-gray-600 uppercase tracking-widest font-bold mb-4 font-display">Node Metadata</div>
                        <div className="space-y-3">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-gray-500">Node ID</span>
                            <span className="text-gray-300 font-mono">{selectedNode.id}</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-gray-500">Latency</span>
                            <span className="text-gray-300 font-mono">1.2s</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-gray-500">Compute Cost</span>
                            <span className="text-gray-300 font-mono">$0.002</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'Analytics' && (
            <div className="flex flex-col h-full overflow-hidden bg-cyber-black border border-cyber-border rounded-2xl shadow-2xl relative">
              <div className="flex-none px-8 py-6 border-b border-[#233529]/30 bg-[#0a120d]/80">
                <div className="flex justify-between items-center relative">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded border"
                        style={{ color: activeWorkspace?.color, borderColor: `${activeWorkspace?.color}40`, backgroundColor: `${activeWorkspace?.color}10` }}>
                        {activeWorkspace?.name}
                      </span>
                    </div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter font-display">System Observability</h2>
                    <p className="text-xs text-gray-500 tracking-wider uppercase font-bold mt-1">Agent orchestration and neural pipeline telemetry</p>
                  </div>
                  <div className="flex items-center gap-5">
                    <div className="relative">
                      <Wifi 
                        size={18} 
                        className={`${isNetworkStatusOpen ? 'text-[#c5f82a]' : 'text-gray-400'} cursor-pointer hover:text-[#c5f82a] transition-colors`} 
                        onClick={() => setIsNetworkStatusOpen(!isNetworkStatusOpen)} 
                      />
                      
                      {isNetworkStatusOpen && (
                        <div className="absolute top-full right-0 mt-3 w-64 bg-[#0a120d] border border-[#233529] rounded-xl shadow-2xl z-50 p-4 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest font-display">Network Status</span>
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 bg-[#c5f82a] rounded-full animate-pulse"></div>
                              <span className="text-[10px] text-[#c5f82a] font-bold font-display">OPTIMAL</span>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] text-gray-500">Latency</span>
                              <span className="text-[10px] text-gray-300">24ms</span>
                            </div>
                            <div className="h-1 bg-[#121c16] rounded-full overflow-hidden">
                              <div className="h-full bg-[#c5f82a]/60 w-[85%]"></div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] text-gray-500">Packet Stability</span>
                              <span className="text-[10px] text-gray-300">99.9%</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] text-gray-500">Endpoint</span>
                              <span className="text-[10px] text-gray-400 truncate ml-4 font-mono">edge.sre.io</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 p-6 flex gap-6 overflow-hidden">
                <div className="w-[60%] flex flex-col h-full bg-[#0a120d]/80 border border-cyber-border/50 rounded-xl p-5 relative shadow-inner">
                  <div className="flex justify-between items-start mb-6 shrink-0">
                    <div>
                      <h2 className="text-lg font-black text-white uppercase tracking-tighter font-display">Agent Activity Stream</h2>
                      <div className="flex items-center gap-2 text-cyber-primary text-[9px] uppercase font-black tracking-[0.2em] mt-2 font-display">
                        <Activity size={12} className="animate-pulse" /> Neural Observability Active
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative group">
                        <input 
                          type="text" 
                          value={activitySearchId} 
                          onChange={e => setActivitySearchId(e.target.value)}
                          placeholder="TARGET_CUSTOMER_ID..." 
                          className="w-48 bg-cyber-black border border-cyber-border py-2 pl-9 pr-3 text-[9px] text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-cyber-primary/40 transition-all font-mono uppercase font-black rounded-md"
                        />
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-cyber-primary transition-colors" />
                      </div>
                      <button 
                        onClick={() => runPipeline(setActiveNodeId, activitySearchId)}
                        disabled={isPipelineRunning}
                        className={`px-4 py-2 rounded-md font-black text-[9px] uppercase tracking-widest transition-all ${
                          isPipelineRunning ? 'bg-zinc-900 text-zinc-700 cursor-not-allowed border border-zinc-800' : 'bg-cyber-primary text-cyber-black hover:shadow-[0_0_15px_rgba(197,248,42,0.3)] active:translate-y-0.5'
                        }`}
                      >
                        {isPipelineRunning ? 'SYS_BUSY' : (activitySearchId ? 'RUN_TARGETED' : 'RUN_PIPELINE')}
                      </button>
                    </div>
                    <button 
                      onClick={() => setIsPaused(!isPaused)}
                      className={`border border-cyber-border rounded-md px-4 py-1.5 text-[9px] font-black uppercase tracking-widest transition-colors ${
                        isPaused ? 'bg-cyber-primary text-cyber-black' : 'bg-cyber-black text-zinc-500 hover:text-white hover:border-zinc-600'
                      }`}
                    >
                      {isPaused ? 'RESUME_FEED' : 'PAUSE_FEED'}
                    </button>
                  </div>
                  
                  <div className="flex-1 min-h-0" ref={eventsContainerRef}>
                    {liveEvents.length > 0 ? (
                      <FixedSizeList
                        height={eventsDimensions.height || 400}
                        itemCount={liveEvents.length}
                        itemSize={140}
                        itemData={liveEvents}
                      >
                        {({ index, style, data }) => (
                          <div style={style}>
                            <LiveEventCard {...data[index]} onChainClick={handleEventClick} />
                          </div>
                        )}
                      </FixedSizeList>
                    ) : (
                      <div className="text-center text-gray-500 py-8 font-mono text-xs">No live events detected</div>
                    )}
                  </div>
                </div>

                <div className="w-[40%] flex flex-col h-full bg-[#0a120d]/80 border border-cyber-border/50 rounded-xl p-5 shadow-inner">
                  <h2 className="text-lg font-black text-white uppercase tracking-tighter font-display mb-6 shrink-0">Pipeline Live View</h2>
                  <div className="flex-1 relative overflow-hidden bg-[#050505] border border-cyber-border rounded-lg shadow-inner flex items-center justify-center">
                    <div className="absolute inset-0" ref={activityContainerRef}>
                      {pipelineGraphData.nodes.length > 0 && activityDimensions.width > 0 ? (
                        <ForceGraph2D
                          width={activityDimensions.width}
                          height={activityDimensions.height}
                          graphData={pipelineGraphData}
                          nodeRelSize={5}
                          backgroundColor="rgba(0,0,0,0)"
                          linkColor={() => '#1A1A1A'}
                          linkOpacity={0.8}
                          linkWidth={1}
                          nodeCanvasObject={activityNodeCanvasObject}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full opacity-30">
                          <div className="w-12 h-12 border-2 border-dashed border-cyber-primary animate-spin-slow mb-4" />
                          <span className="text-[10px] uppercase tracking-[0.3em] font-black text-cyber-primary font-display">Initializing Neural Path...</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Escalations' && (
            <div className="flex flex-col h-full bg-[#070c08]/80 backdrop-blur-2xl rounded-3xl border border-[#1a281e] p-6 shadow-2xl relative overflow-hidden">
              <div className="flex flex-col mb-6 shrink-0 gap-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded border"
                        style={{ color: activeWorkspace?.color, borderColor: `${activeWorkspace?.color}40`, backgroundColor: `${activeWorkspace?.color}10` }}>
                        {activeWorkspace?.name}
                      </span>
                      <div className="text-gray-200 font-bold tracking-widest flex items-center text-sm font-display">SENTIENT RETENTION ENGINE <span className="text-gray-600 font-normal mx-3">|</span> <span className="text-gray-400 font-normal">Human Handoff Queue</span></div>
                    </div>
                    <div className="bg-[#c5f82a] text-[#0a110b] px-3 py-1 rounded-full font-bold text-[10px] tracking-wider shadow-[0_0_10px_rgba(197,248,42,0.2)] font-display">{escalations.length} Active</div>
                  </div>
                  <div className="flex items-center gap-5">
                    <div className="flex items-center gap-6 px-6 py-2 bg-[#121c16] border border-[#1a281e] rounded-2xl mr-4">
                      <div className="flex flex-col">
                        <span className="text-[8px] text-gray-500 uppercase font-bold tracking-widest font-display">Avg Response</span>
                        <span className="text-xs font-mono text-[#c5f82a]">{escalations.length > 3 ? '1.8m' : '0.9m'}</span>
                      </div>
                      <div className="w-px h-6 bg-[#1a281e]"></div>
                      <div className="flex flex-col">
                        <span className="text-[8px] text-gray-500 uppercase font-bold tracking-widest font-display">SLA Health</span>
                        <span className={`text-xs font-mono ${escalations.length > 5 ? 'text-orange-400' : 'text-green-400'}`}>
                          {Math.max(92, 100 - (escalations.length * 1.2)).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-px h-6 bg-[#1a281e]"></div>
                      <div className="flex flex-col">
                        <span className="text-[8px] text-gray-500 uppercase font-bold tracking-widest font-display">Peak Load</span>
                        <span className={`text-xs font-mono ${escalations.length > 4 ? 'text-red-400' : 'text-orange-400'}`}>
                          {escalations.length > 6 ? 'CRITICAL' : escalations.length > 3 ? 'MODERATE' : 'OPTIMAL'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="relative">
                      <button 
                        onClick={() => setIsCommandMenuOpen(!isCommandMenuOpen)} 
                        className={`transition-colors ${isCommandMenuOpen ? 'text-[#c5f82a]' : 'text-gray-500 hover:text-white'}`}
                      >
                        <Settings size={18} />
                      </button>
                      {isCommandMenuOpen && (
                        <div className="absolute top-full right-0 mt-3 w-56 bg-[#0a120d] border border-[#233529] rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="p-2 border-b border-[#233529]/50 bg-[#121c16]/50">
                            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold px-3 py-1">Escalation Controls</span>
                          </div>
                          <div className="py-1 text-left">
                            <button onClick={() => { exportToCSV(escalations, 'active_escalations'); setIsCommandMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2 text-xs text-gray-300 hover:bg-[#c5f82a]/10 hover:text-[#c5f82a] transition-colors">
                              <BarChart2 size={14} /> Export Queue Data
                            </button>
                            <button onClick={() => { refreshData(); setIsCommandMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2 text-xs text-gray-300 hover:bg-[#c5f82a]/10 hover:text-[#c5f82a] transition-colors">
                              <Activity size={14} /> Force Refresh Queue
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="relative">
                      <button 
                        onClick={() => setShowNotifications(!showNotifications)} 
                        className={`relative transition-colors ${showNotifications ? 'text-[#c5f82a]' : 'text-gray-500 hover:text-white'}`}
                      >
                        <Bell size={18} />
                        {notifications.some(n => !n.read) && (
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 border-2 border-[#070c08] bg-red-500 rounded-full animate-pulse"></span>
                        )}
                      </button>
                      
                      {showNotifications && (
                        <div className="absolute top-full right-0 mt-3 w-80 bg-[#0a120d] border border-[#233529] rounded-xl shadow-2xl z-50 p-1 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="p-3 border-b border-[#233529]/50 flex justify-between items-center">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Recent Alerts</span>
                            <button 
                              onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
                              className="text-[9px] text-[#c5f82a] hover:underline"
                            >
                              Mark all as read
                            </button>
                          </div>
                          <div className="max-h-64 overflow-y-auto custom-scrollbar">
                            {notifications.map(n => (
                              <div key={n.id} className={`p-3 border-b border-[#233529]/20 hover:bg-white/5 transition-colors ${!n.read ? 'bg-[#c5f82a]/5' : ''}`}>
                                <div className="flex justify-between items-start mb-1">
                                  <span className={`text-[10px] font-bold uppercase ${n.type === 'error' ? 'text-red-400' : n.type === 'success' ? 'text-green-400' : 'text-[#c5f82a]'}`}>
                                    {n.title}
                                  </span>
                                  <span className="text-[9px] text-gray-600">{n.time}</span>
                                </div>
                                <p className="text-[11px] text-gray-400 leading-tight">{n.message}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="relative group max-w-md">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#c5f82a] transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Filter queue by ID or Reason..." 
                    value={escalationSearch}
                    onChange={(e) => setEscalationSearch(e.target.value)}
                    className="w-full bg-[#121c16] border border-[#1a281e] focus:border-[#c5f82a]/50 rounded-2xl py-3 pl-12 pr-6 text-sm text-gray-300 outline-none transition-all shadow-inner"
                  />
                </div>
              </div>
              <div className="flex gap-10 flex-1 min-h-0">
                <div className="w-[35%] flex flex-col h-full">
                  <div className="mb-6 shrink-0">
                    <form onSubmit={e => { e.preventDefault(); handleManualSearch(searchId, setSelectedEscalation); }} className="relative group">
                      <input type="text" value={searchId} onChange={e => setSearchId(e.target.value)} placeholder="Manual Search (Customer ID)..." className="w-full bg-[#0f1712]/50 border border-[#1a281e] rounded-xl py-3 pl-11 pr-4 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#c5f82a]/40 focus:bg-[#0f1712]/80 transition-all shadow-inner" />
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-[#c5f82a] transition-colors">{isSearching ? <div className="w-4 h-4 border-2 border-[#c5f82a]/30 border-t-[#c5f82a] rounded-full animate-spin" /> : <Search size={16} />}</div>
                      <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#c5f82a]/10 hover:bg-[#c5f82a]/20 text-[#c5f82a] px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-[#c5f82a]/20 transition-all hover:scale-105 active:scale-95">Search</button>
                    </form>
                  </div>

                  <div className="text-sm font-bold text-gray-200 mb-4 uppercase tracking-widest">Active Escalations</div>
                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {filteredEscalations.length > 0 ? filteredEscalations.map(esc => (
                      <div key={esc.id} className="relative group/esc">
                        <EscalationCard {...esc} onViewDetails={() => setSelectedEscalation(esc)} onTakeOwnership={handleClaim} />
                        <button
                          onClick={() => openAIReasoning({ ...esc, score: esc.churnRisk ?? 0.78 })}
                          className="absolute top-3 right-3 opacity-0 group-hover/esc:opacity-100 transition-opacity z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyber-primary/10 border border-cyber-primary/30 text-cyber-primary text-[9px] font-mono font-bold uppercase tracking-widest hover:bg-cyber-primary/20"
                        >
                          <span>AI Reasoning</span>
                        </button>
                      </div>
                    )) : (
                      <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-4 opacity-50">
                        <Activity size={48} />
                        <div className="text-xs font-semibold tracking-widest uppercase">No Matching Escalations</div>
                      </div>
                    )}
                  </div>

                  {claimedEscalations.length > 0 && (
                    <div className="mt-4 shrink-0">
                      <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-3 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#c5f82a] shadow-[0_0_6px_#c5f82a]"></div>My Tasks — Claimed ({claimedEscalations.length})</div>
                      <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                        {claimedEscalations.map((item, i) => (
                          <div key={item.id || i} className="bg-[#0f1712]/60 border border-[#c5f82a]/20 rounded-xl p-3 flex items-center justify-between group hover:border-[#c5f82a]/40 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full bg-[#c5f82a]/60"></div>
                              <div>
                                <div className="text-gray-200 font-mono text-[11px] font-bold">{item.id || item.user_id}</div>
                                <div className="text-gray-500 text-[10px] mt-0.5">Claimed {item.claimed_at ? new Date(item.claimed_at).toLocaleTimeString() : 'just now'}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#c5f82a]/10 text-[#c5f82a] border border-[#c5f82a]/20 uppercase tracking-wider">In Progress</span>
                              <button onClick={() => setActiveSpecialistCase(item)} className="text-gray-600 hover:text-green-400 transition-colors text-[10px] font-bold uppercase tracking-wider hover:bg-green-400/10 px-2 py-1 rounded-lg">View</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="w-[65%] flex flex-col h-full">
                  <div className="flex items-center gap-2 mb-4 uppercase tracking-widest"><span className="text-sm font-bold text-gray-200">Chain of Thought Stream</span><span className="text-gray-600">//</span><span className="text-xs font-bold text-[#c5f82a] drop-shadow-[0_0_5px_rgba(197,248,42,0.5)]">LIVE</span></div>
                  <ChainOfThoughtTerminal logs={terminalText} />
                  
                  <div className="mt-6 flex-1 min-h-0 flex flex-col">
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users size={12} className="text-[#c5f82a]" />
                        Operations Log
                      </div>
                      <span className="text-[9px] text-gray-700">Team View</span>
                    </div>
                    <div className="flex-1 bg-[#0f1712]/40 border border-[#1a281e] rounded-2xl p-4 overflow-y-auto custom-scrollbar">
                      <div className="space-y-4">
                        {opsLogs.length > 0 ? opsLogs.map((log, i) => (
                          <div key={log.id || i} className="flex gap-4 items-start animate-event-in">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#c5f82a] mt-1.5 shrink-0 shadow-[0_0_5px_#c5f82a]"></div>
                            <div className="flex-1">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">{log.action || 'INTERVENTION'}</span>
                                <span className="text-[9px] font-mono text-gray-600">{new Date(log.timestamp).toLocaleTimeString()}</span>
                              </div>
                              <p className="text-[11px] text-gray-500 leading-relaxed">{log.details || log.reason || 'Specialist action logged in system.'}</p>
                            </div>
                          </div>
                        )) : (
                          <div className="h-full flex flex-col items-center justify-center opacity-30 gap-3">
                            <Activity size={24} />
                            <span className="text-[10px] uppercase font-bold tracking-widest">Awaiting Live Operations...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {notification && (
          <div className="fixed bottom-10 right-10 z-[1000] animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className="bg-[#c5f82a] text-[#0a110b] px-6 py-3 rounded-2xl font-bold text-sm shadow-[0_0_30px_rgba(197,248,42,0.4)] flex items-center gap-3"><Activity size={18} className="animate-pulse" />{notification}</div>
          </div>
        )}

      {isAdminView && <EscalationDetailsModal isOpen={!!selectedEscalation} onClose={() => setSelectedEscalation(null)} escalation={selectedEscalation} onClaim={handleClaim} />}
      
      <WorkflowChainOverlay 
        isOpen={isTimelineOpen} 
        onClose={() => setIsTimelineOpen(false)} 
        events={chainEvents} 
        activeChainId={selectedChainId}
      />

      <AIReasoningPanel
        entity={aiReasoningEntity}
        onClose={() => setAiReasoningEntity(null)}
        triggerLabel={aiReasoningEntity?.reason || 'Churn Decision'}
      />

        {activeSpecialistCase && (
          <SpecialistDashboard 
            escalation={activeSpecialistCase} 
            onClose={() => setActiveSpecialistCase(null)} 
            onResolved={id => {
              setClaimedEscalations(prev => prev.filter(c => (c.id || c.user_id) !== id && c.id !== id));
              setActiveSpecialistCase(null);
              triggerAction(`Case ${id} resolved and removed from active tasks`);
              refreshData();
            }} 
          />
        )}
    </div>
  </div>
);
};

export default Dashboard;