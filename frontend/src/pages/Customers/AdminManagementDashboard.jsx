import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { 
  Users, AlertCircle, Shield, ChevronRight, Search, Filter, 
  RefreshCcw, CheckCircle, Clock, MoreVertical, LayoutGrid, 
  List, Activity, ArrowRight, UserCheck, MessageSquare, ArrowLeft,
  Bell, Settings, HelpCircle, LogOut, Plus, Gavel, History, ShieldAlert,
  Heart, DollarSign, TrendingUp, Zap, CheckSquare, Square, Check, AlertTriangle, Target
} from 'lucide-react';
import { useDashboardData } from '../../hooks/useDashboardData';
import SpecialistDashboard from '../Dashboard/SpecialistDashboard';
import { BrandLogo } from '../../components/dashboard/DashboardComponents';
import config from '../../config';
import apiClient from '../../services/apiClient';
import { useNavigate, useLocation } from 'react-router-dom';

const AdminManagementDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const claimId = queryParams.get('claim');
  
  // Choose an appropriate icon for Ops Center
  const OpsIcon = LayoutGrid;
  const { 
    kpis, 
    logout 
  } = useDashboardData();

  const [pendingEscalations, setPendingEscalations] = useState([]);
  const [claimedEscalations, setClaimedEscalations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEscalation, setSelectedEscalation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState('list'); // 'grid' or 'list'
  const [activeSubTab, setActiveSubTab] = useState('ops'); // 'ops', 'team', 'health', 'logs', 'settings', 'governance'
  const [notification, setNotification] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);



  const user = JSON.parse(localStorage.getItem('sre_user') || '{}');

  const fetchEscalations = async () => {
    setIsLoading(true);
    try {
      const [pendingRes, claimedRes] = await Promise.all([
        apiClient.get('/escalations/pending'),
        apiClient.get(`/escalations/claimed?specialist_id=${user.id}`)
      ]);

      setPendingEscalations(pendingRes.data.pending || []);
      setClaimedEscalations(claimedRes.data.claimed || []);
    } catch (err) {
      console.error('Failed to fetch escalations:', err);
      if (err.response?.status === 401) logout();
    } finally {
      setIsLoading(false);
    }
  };

  const [specialists, setSpecialists] = useState([]);
  const fetchSpecialists = async () => {
    try {
      const res = await apiClient.get('/admin/specialists');
      setSpecialists(res.data.specialists || []);
    } catch (err) {
      console.error('Failed to fetch specialists:', err);
    }
  };


  useEffect(() => {
    fetchEscalations();
    if (activeSubTab === 'team') fetchSpecialists();
    
    const interval = setInterval(() => {
      fetchEscalations();
      if (activeSubTab === 'team') fetchSpecialists();
    }, 10000);
    return () => clearInterval(interval);
  }, [activeSubTab]);

  const triggerAction = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSaveSettings = async () => {
    try {
      await apiClient.post('/admin/settings', {
        model_version: 'v4.2-pro',
        retention_threshold: 0.85,
        auto_escalation: true
      });

      triggerAction('Settings synchronization complete.');
    } catch (err) {
      console.error('Save settings failed:', err);
      triggerAction('Failed to save settings.');
    }
  };

  const handleAddSpecialist = async () => {
    try {
      const name = prompt('Enter specialist username:');
      if (!name) return;
      
      await apiClient.post('/admin/specialists', {
        username: name,
        role: 'Specialist',
        specialty: 'Retention',
        status: 'offline'
      });

      triggerAction(`Provisioned access for ${name}`);
      fetchSpecialists();
    } catch (err) {
      console.error('Add specialist failed:', err);
    }
  };

  // Auto-claim logic
  useEffect(() => {
    if (claimId && pendingEscalations.length > 0) {
      const target = pendingEscalations.find(p => p.id === claimId);
      if (target) {
        console.log('Auto-claiming case:', claimId);
        handleClaim(target);
        // Clear the query param so it doesn't re-claim on refresh
        navigate('/admin/management', { replace: true });
      }
    }
  }, [claimId, pendingEscalations, navigate]);

  const handleClaim = async (esc) => {
    try {
      const res = await apiClient.post('/escalations/claim', {
        escalation_id: esc.id,
        user_id: esc.user_id,
        specialist_id: user.id,
        specialist_name: user.username,
        churn_risk: esc.churn_risk || 0.8
      });

      const result = res.data;
      // Move from pending to claimed locally for instant feedback
      setPendingEscalations(prev => prev.filter(p => p.id !== esc.id));
      setClaimedEscalations(prev => [{ ...esc, status: 'claimed', id: result.action_id }, ...prev]);
      
      // Open the workspace for this escalation
      setSelectedEscalation({
        ...esc,
        id: result.action_id,
        userId: esc.user_id,
        churnRisk: esc.churn_risk || 0.8
      });
    } catch (err) {
      console.error('Claim failed:', err);
    }
  };

  const filteredPending = pendingEscalations.filter(esc => 
    esc.user_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (esc.reason || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#060c08] text-gray-200 font-sans flex overflow-hidden">
      <Helmet>
        <title>Admin Dashboard | Sentient Retention Engine</title>
        <meta name="description" content="Enterprise AI observability and orchestration for proactive customer retention. Monitor agentic workflows and manage high-risk customer escalations." />
        <meta property="og:title" content="Sentient Retention Engine - Admin Dashboard" />
        <meta property="og:description" content="Real-time AI orchestration and risk management dashboard." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      {/* ── Sidebar ── */}
      <aside className="fixed left-0 top-0 w-64 h-screen border-r border-[#1a281e] bg-[#09110b] flex flex-col z-50 overflow-hidden">
        <div className="flex flex-col h-full overflow-y-auto no-scrollbar">
          {/* Header */}
          <div className="px-6 py-10 border-b border-[#1a281e] shrink-0">
            <BrandLogo isSidebar />
          </div>

          {/* Navigation - Scrollable part */}
          <div className="flex-1 p-6">
            <nav className="space-y-1">
              <NavItem 
                icon={OpsIcon} 
                label="Ops Center" 
                active={activeSubTab === 'ops'} 
                onClick={() => setActiveSubTab('ops')} 
              />
              <NavItem 
                icon={ArrowLeft} 
                label="Live Dashboard" 
                onClick={() => navigate('/dashboard')} 
              />
              <NavItem 
                icon={Users} 
                label="Team Management" 
                active={activeSubTab === 'team'} 
                onClick={() => setActiveSubTab('team')} 
              />


              <NavItem 
                icon={Settings} 
                label="Admin Settings" 
                active={activeSubTab === 'settings'} 
                onClick={() => setActiveSubTab('settings')} 
              />
            </nav>

            <div className="mt-10">
              <div className="text-[10px] text-white/30 font-bold uppercase tracking-[0.2em] mb-6 px-4 font-display">Operations KPIs</div>
              <div className="space-y-6 px-4">
                <KpiMini label="Pending Cases" value={pendingEscalations.length} color="text-red-400" />
                <KpiMini label="Avg Resolution" value="14m" />
                <KpiMini label="Specialists" value="4 Online" color="text-[#c5f82a]" />
              </div>
            </div>
            
            <div className="mt-10 pt-8 border-t border-[#1a281e]">
              <NavItem 
                icon={HelpCircle} 
                label="Help & Support" 
                onClick={() => triggerAction('Support desk notified. Standing by...')} 
              />
            </div>
          </div>

          {/* Bottom Profile Section - Sticky at bottom of sidebar */}
          <div className="p-8 border-t border-[#1a281e] bg-[#09110b] shrink-0">
            <div className="relative">
              <div 
                className="flex items-center gap-3 mb-6 cursor-pointer hover:bg-white/5 p-2 rounded-xl transition-colors"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                <div className="w-8 h-8 rounded-full bg-[#1a281e] flex items-center justify-center border border-[#2a4230]">
                  <UserCheck size={14} className="text-[#c5f82a]" />
                </div>
                <div className="overflow-hidden flex-1">
                  <div className="text-xs font-bold text-white truncate">{user.username || 'Admin'}</div>
                  <div className="text-[9px] text-gray-500 uppercase tracking-widest">Root Authority</div>
                </div>
                <ChevronRight size={14} className={`text-gray-600 transition-transform ${showProfileMenu ? 'rotate-90' : ''}`} />
              </div>

              {showProfileMenu && (
                <div className="absolute bottom-full left-0 w-full mb-2 bg-[#09110b] border border-[#1a281e] rounded-xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-2 duration-200 z-50">
                  <button onClick={() => { setActiveSubTab('settings'); setShowProfileMenu(false); }} className="w-full text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:bg-white/5 hover:text-white transition-colors border-b border-[#1a281e]">Account Profile</button>
                  <button onClick={() => triggerAction('Key rotation scheduled.')} className="w-full text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:bg-white/5 hover:text-white transition-colors">Access Keys</button>
                </div>
              )}
            </div>
            <button 
              onClick={() => {
                triggerAction('Shutting down session...');
                setTimeout(logout, 1000);
              }}
              className="w-full py-3 rounded-xl border border-red-500/20 bg-red-500/5 text-[10px] font-bold uppercase tracking-widest text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
            >
              <LogOut size={14} />
              Terminal Shutdown
            </button>
          </div>
        </div>
      </aside>

      {/* Sidebar Spacer */}
      <div className="w-64 shrink-0"></div>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#c5f82a]/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />

        {/* Header */}
        <header className="h-24 border-b border-[#1a281e] flex items-center justify-between px-10 shrink-0 bg-[#060c08]/50 backdrop-blur-xl z-10">
          <div>
            <h1 className="text-2xl font-bold text-white font-display tracking-tight">
              {activeSubTab === 'ops' ? 'Escalation Management' : 
               activeSubTab === 'team' ? 'Team Control' :
               activeSubTab === 'health' ? 'System Telemetry' : 
               activeSubTab === 'settings' ? 'Global Settings' : 'Security Audit'}
            </h1>
            <p className="text-[10px] text-white/40 mt-1 uppercase tracking-[0.15em] font-display font-medium">
              {activeSubTab === 'ops' ? 'Manual Intervention Pipeline' : 
               activeSubTab === 'team' ? 'Specialist Roster & Performance' :
               activeSubTab === 'health' ? 'Real-time Infrastructure Monitoring' : 
               activeSubTab === 'settings' ? 'Environment Configuration & Rules' : 'Immutable Access Logs'}
            </p>
          </div>

          <div className="flex items-center gap-6">
            {activeSubTab === 'ops' && (
              <div className="relative group">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-[#c5f82a] transition-colors" />
                <input 
                  id="case-search"
                  type="text" 
                  placeholder="Search case or user ID..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  aria-label="Search escalations"
                  className="bg-[#0a110b] border border-[#1a281e] rounded-xl py-3 pl-12 pr-6 text-sm text-gray-300 w-64 focus:outline-none focus:border-[#c5f82a]/30 transition-all"
                />
              </div>
            )}
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                aria-label="Toggle notifications"
                aria-expanded={showNotifications}
                className={`relative p-3 rounded-xl border border-[#1a281e] hover:bg-white/5 transition-colors ${showNotifications ? 'text-[#c5f82a] bg-[#c5f82a]/5 border-[#c5f82a]/20' : 'text-gray-400'}`}
              >
                <Bell size={18} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[#060c08]" />
                
                {showNotifications && (
                  <div className="absolute top-full right-0 mt-4 w-80 bg-[#09110b] border border-[#1a281e] rounded-2xl shadow-2xl p-4 z-50 text-left animate-in zoom-in-95 duration-200">
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-4">Recent Alerts</div>
                    <div className="space-y-3">
                      <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                        <div className="text-[11px] font-bold text-white">System: Peak Load Detected</div>
                        <div className="text-[9px] text-gray-500 mt-1 font-mono">2 mins ago</div>
                      </div>
                      <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                        <div className="text-[11px] font-bold text-white">Security: Multiple Login Attempts</div>
                        <div className="text-[9px] text-gray-500 mt-1 font-mono">15 mins ago</div>
                      </div>
                    </div>
                  </div>
                )}
              </button>

              <button 
                onClick={() => setActiveSubTab('settings')}
                aria-label="Admin settings"
                className={`p-3 rounded-xl border border-[#1a281e] hover:bg-white/5 transition-colors ${activeSubTab === 'settings' ? 'text-[#c5f82a] bg-[#c5f82a]/5 border-[#c5f82a]/20' : 'text-gray-400'}`}
              >
                <Settings size={18} />
              </button>
            </div>
            <div className="h-10 w-px bg-[#1a281e]" />
            <div className="flex items-center gap-1 bg-[#0a110b] border border-[#1a281e] rounded-xl p-1">
              <button 
                onClick={() => setViewMode('list')}
                aria-label="Switch to list view"
                className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-[#1a281e] text-[#c5f82a]' : 'text-gray-500 hover:text-gray-300'}`}
              >
                <List size={18} />
              </button>
              <button 
                onClick={() => setViewMode('grid')}
                aria-label="Switch to grid view"
                className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-[#1a281e] text-[#c5f82a]' : 'text-gray-500 hover:text-gray-300'}`}
              >
                <LayoutGrid size={18} />
              </button>
            </div>
            <button 
              onClick={fetchEscalations}
              aria-label="Refresh escalations"
              className="p-3 rounded-xl border border-[#1a281e] hover:bg-white/5 transition-colors text-gray-400"
            >
              <RefreshCcw size={18} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-10 custom-scrollbar z-0">
          <div className="max-w-6xl mx-auto space-y-10">
            {activeSubTab === 'ops' && (
              <>
                {/* Active Task Summary */}
                <div className="grid grid-cols-4 gap-6">
                  <StatCard label="Live Escalations" value={pendingEscalations.length} trend="+2 new" trendColor="text-red-400" icon={AlertCircle} color="red" />
                  <StatCard label="Claimed by Me" value={claimedEscalations.length} trend="In Progress" trendColor="text-[#c5f82a]" icon={UserCheck} color="green" />
                  <StatCard label="Avg Risk Score" value="88%" trend="-2.4%" trendColor="text-green-400" icon={Activity} color="blue" />
                  <StatCard label="SLA Compliance" value="94.2%" trend="+0.8%" trendColor="text-[#c5f82a]" icon={Clock} color="cyan" />
                </div>

                {/* Main List Section */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-bold text-white font-display tracking-tight">Pending Queue</h2>
                      <span className="bg-red-500/10 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-red-500/20 uppercase tracking-[0.1em] font-display">Immediate Attention</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <select 
                        id="priority-filter"
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        aria-label="Filter by priority"
                        className="bg-[#0a110b] border border-[#1a281e] rounded-lg text-xs font-bold text-gray-500 px-3 py-1.5 focus:outline-none focus:border-[#c5f82a]/30"
                      >
                        <option value="all">Priority: All</option>
                        <option value="high">Priority: High Risk</option>
                        <option value="low">Priority: Standard</option>
                      </select>
                    </div>
                  </div>

                  {isLoading && pendingEscalations.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-gray-600">
                      <RefreshCcw size={40} className="animate-spin mb-4 opacity-20" />
                      <p className="text-sm font-medium uppercase tracking-widest">Synchronizing with Agent Memory...</p>
                    </div>
                  ) : filteredPending.length > 0 ? (
                    <div className={viewMode === 'grid' ? "grid grid-cols-3 gap-6" : "space-y-4"}>
                      {filteredPending.map((esc, i) => (
                        <EscalationItem 
                          key={esc.id || i} 
                          esc={esc} 
                          mode={viewMode} 
                          onClaim={() => handleClaim(esc)} 
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="bg-[#0a110b] border border-[#1a281e] rounded-3xl py-20 flex flex-col items-center justify-center border-dashed">
                      <div className="w-16 h-16 bg-[#1a281e] rounded-2xl flex items-center justify-center mb-4">
                        <CheckCircle size={30} className="text-gray-700" />
                      </div>
                      <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Queue Clear</p>
                      <p className="text-gray-700 text-sm mt-1">No active escalations requiring manual intervention.</p>
                    </div>
                  )}
                </div>

                {/* Claimed History / My Tasks */}
                {claimedEscalations.length > 0 && (
                  <div>
                    <h2 className="text-lg font-bold text-white mb-6 font-display tracking-tight">My Active Cases</h2>
                    <div className="grid grid-cols-2 gap-6">
                      {claimedEscalations.map((esc, i) => (
                        <div 
                          key={esc.id || i}
                          onClick={() => setSelectedEscalation({ ...esc, userId: esc.user_id, churnRisk: esc.churn_risk || 0.8 })}
                          className="group bg-[#0a110b] border border-[#1a281e] hover:border-[#c5f82a]/30 p-6 rounded-3xl transition-all cursor-pointer relative overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 w-32 h-32 bg-[#c5f82a]/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                          
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-[#c5f82a]/10 border border-[#c5f82a]/20 rounded-xl flex items-center justify-center text-[#c5f82a]">
                                <UserCheck size={20} />
                                </div>
                              <div>
                                <div className="text-sm font-bold text-white font-display">{esc.user_id}</div>
                                <div className="text-[10px] text-white/30 uppercase font-mono tracking-tighter">{esc.id}</div>
                              </div>
                            </div>
                            <span className="text-[9px] font-bold text-[#c5f82a] bg-[#c5f82a]/10 border border-[#c5f82a]/20 px-2 py-1 rounded-lg uppercase tracking-[0.1em] font-display">In Progress</span>
                          </div>
                          
                          <div className="text-[11px] text-gray-400 line-clamp-2 mb-6 h-8 italic font-mono">
                            "{esc.reason || 'Manual retention strategy application in progress.'}"
                          </div>
                          
                          <div className="flex items-center justify-between pt-6 border-t border-[#1a281e]">
                            <div className="flex items-center gap-2">
                              <Clock size={12} className="text-white/20" />
                              <span className="text-[10px] text-white/30 font-bold uppercase tracking-[0.1em] font-display">Claimed {new Date(esc.claimed_at || esc.executed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <button className="text-[10px] font-bold text-[#c5f82a] uppercase tracking-[0.1em] font-display flex items-center gap-1 group-hover:gap-2 transition-all">
                              Resume Workspace
                              <ArrowRight size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}



            {activeSubTab === 'team' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-3 gap-6">
                  <StatCard icon={Users} label="Active Specialists" value="12 Online" trend="+2" trendColor="text-[#c5f82a]" color="green" />
                  <StatCard icon={MessageSquare} label="Concurrent Chats" value="28" trend="High" trendColor="text-orange-400" color="blue" />
                  <StatCard icon={Activity} label="Avg Sat Score" value="4.8/5" trend="+0.2" trendColor="text-[#c5f82a]" color="cyan" />
                </div>
                
                <div className="bg-[#0a110b] border border-[#1a281e] rounded-3xl overflow-hidden">
                  <div className="p-8 border-b border-[#1a281e] flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white">Human-in-the-Loop Roster</h3>
                    <button 
                      onClick={handleAddSpecialist}
                      className="px-4 py-2 bg-[#1a281e] text-[#c5f82a] border border-[#2a4230] rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-[#c5f82a] hover:text-[#0a110b] transition-all flex items-center gap-2"
                    >
                      <Plus size={14} />
                      Add Specialist
                    </button>
                  </div>
                  <div className="p-0">
                    {(specialists.length > 0 ? specialists : [
                      { name: 'Admin Root', role: 'Super Admin', cases: 142, status: 'Online', lastActive: 'Now' },
                      { name: 'Sarah Chen', role: 'Senior Specialist', cases: 89, status: 'Active', lastActive: '2m ago' }
                    ]).map((member, i) => (
                      <div key={i} className="flex items-center justify-between p-6 border-b border-[#1a281e] last:border-0 hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-4 w-64">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1a281e] to-[#0a110b] border border-[#2a4230] flex items-center justify-center text-[#c5f82a] font-bold text-xs">
                            {member.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white">{member.name}</div>
                            <div className="text-[10px] text-gray-500 uppercase tracking-widest">{member.role}</div>
                          </div>
                        </div>
                        <div className="flex-1 flex gap-12">
                          <div>
                            <div className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">Lifetime Cases</div>
                            <div className="text-sm font-bold text-gray-300 font-mono">{member.cases}</div>
                          </div>
                          <div>
                            <div className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">Status</div>
                            <div className={`text-sm font-bold ${member.status === 'Online' || member.status === 'Active' ? 'text-[#c5f82a]' : 'text-gray-600'}`}>{member.status}</div>
                          </div>
                          <div>
                            <div className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">Last Sync</div>
                            <div className="text-sm font-bold text-gray-500 font-mono">{member.lastActive}</div>
                          </div>
                        </div>
                        <button 
                          onClick={() => triggerAction(`Modified permissions for ${member.name}`)}
                          className="p-2 text-gray-600 hover:text-white transition-colors"
                        >
                          <MoreVertical size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}




            {activeSubTab === 'settings' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-2 gap-8">
                  <div className="bg-[#0a110b] border border-[#1a281e] p-8 rounded-3xl">
                    <h3 className="text-lg font-bold text-white mb-6">Pipeline Thresholds</h3>
                    <div className="space-y-6">
                      <div className="flex flex-col gap-2">
                        <label htmlFor="risk-threshold" className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Escalation Risk Score Threshold</label>
                        <div className="flex items-center gap-4">
                          <input id="risk-threshold" type="range" className="flex-1 accent-[#c5f82a]" />
                          <span className="text-sm font-mono text-[#c5f82a]">85%</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label htmlFor="handoff-delay" className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Auto-Handoff Delay (ms)</label>
                        <input id="handoff-delay" type="number" defaultValue={500} className="bg-[#060c08] border border-[#1a281e] p-3 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-[#c5f82a]/50" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-[#0a110b] border border-[#1a281e] p-8 rounded-3xl">
                    <h3 className="text-lg font-bold text-white mb-6">Security Access</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-[#060c08] border border-[#1a281e] rounded-xl">
                        <span className="text-sm font-bold text-gray-200">Multi-Factor Auth</span>
                        <div className="w-10 h-5 bg-[#c5f82a]/20 border border-[#c5f82a]/40 rounded-full relative">
                          <div className="absolute top-1 right-1 w-3 h-3 bg-[#c5f82a] rounded-full" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-[#060c08] border border-[#1a281e] rounded-xl opacity-50">
                        <span className="text-sm font-bold text-gray-200">Hardware Keys (YubiKey)</span>
                        <div className="w-10 h-5 bg-gray-800 border border-gray-700 rounded-full relative">
                          <div className="absolute top-1 left-1 w-3 h-3 bg-gray-600 rounded-full" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={handleSaveSettings}
                  className="w-full py-4 bg-[#c5f82a] text-[#0a110b] font-bold rounded-2xl hover:shadow-[0_0_30px_rgba(197,248,42,0.4)] transition-all active:scale-[0.99]"
                >
                  Save Environment Changes
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ── Notification Toast ── */}
      {notification && (
        <div className="fixed bottom-10 right-10 z-[2000] animate-in slide-in-from-right-10 fade-in duration-300">
          <div className="bg-[#c5f82a] text-[#0a110b] px-6 py-3 rounded-2xl font-bold text-sm shadow-[0_0_40px_rgba(197,248,42,0.4)] flex items-center gap-3 border border-white/20">
            <Activity size={18} className="animate-pulse" />
            {notification}
          </div>
        </div>
      )}

      {/* ── Escalation Workspace (Modal) ── */}
      {selectedEscalation && (
        <SpecialistDashboard 
          escalation={selectedEscalation} 
          onClose={() => {
            setSelectedEscalation(null);
            fetchEscalations();
          }}
          onResolved={() => {
            setSelectedEscalation(null);
            fetchEscalations();
          }}
        />
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1a281e; border-radius: 10px; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

const NavItem = ({ icon: Icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    aria-current={active ? 'page' : undefined}
    aria-label={`Navigate to ${label}`}
    className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
      active ? 'bg-[#c5f82a]/10 text-[#c5f82a]' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
    }`}
  >
    <Icon size={18} />
    <span className="text-xs font-bold uppercase tracking-[0.15em] font-display">{label}</span>
  </button>
);

const KpiMini = ({ label, value, color = "text-white" }) => (
  <div className="flex flex-col">
    <div className="text-[11px] text-white/50 font-bold uppercase tracking-[0.2em] mb-1.5 font-display">{label}</div>
    <div className={`text-xl font-bold font-mono tracking-tight ${color}`}>{value}</div>
  </div>
);

const StatCard = ({ label, value, trend, trendColor, icon: Icon, color }) => {
  const colorMap = {
    red: 'border-red-500/20 bg-red-500/5 text-red-400',
    green: 'border-[#c5f82a]/20 bg-[#c5f82a]/5 text-[#c5f82a]',
    blue: 'border-blue-500/20 bg-blue-500/5 text-blue-400',
    cyan: 'border-cyan-500/20 bg-cyan-500/5 text-cyan-400',
    teal: 'border-teal-500/20 bg-teal-500/5 text-teal-400'
  };

  return (
    <div className="bg-[#0a110b] border border-[#1a281e] p-6 rounded-3xl relative overflow-hidden group hover:border-[#c5f82a]/20 transition-colors">
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none group-hover:bg-[#c5f82a]/5 transition-colors" />
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2.5 rounded-xl border ${colorMap[color]}`}>
          <Icon size={18} />
        </div>
        <div className={`text-[10px] font-bold ${trendColor} uppercase tracking-[0.1em] font-display`}>{trend}</div>
      </div>
      <div className="text-[10px] text-white/30 font-bold uppercase tracking-[0.15em] mb-1 font-display">{label}</div>
      <div className="text-2xl font-bold text-white font-mono tracking-tight">{value}</div>
    </div>
  );
};

const EscalationItem = ({ esc, mode, onClaim }) => {
  const isHighRisk = esc.churn_risk > 0.85;
  const isGovernance = !!esc.metadata?.governance_data;

  if (mode === 'grid') {
    return (
      <div className="bg-[#0a110b] border border-[#1a281e] p-6 rounded-3xl hover:border-[#c5f82a]/30 transition-all flex flex-col h-full group relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#c5f82a]/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none group-hover:bg-[#c5f82a]/10 transition-colors" />
        <div className="flex justify-between items-start mb-6 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1a281e] rounded-xl flex items-center justify-center border border-white/5 shadow-inner">
              <Activity size={20} className={isGovernance ? 'text-[#c5f82a]' : isHighRisk ? 'text-red-400' : 'text-orange-400'} />
            </div>
            <div>
              <div className="text-base font-bold text-white font-display tracking-tight leading-none mb-1">{esc.user_id}</div>
              <div className="text-[10px] text-white/40 font-mono tracking-wider font-medium uppercase">Reference: {esc.id?.slice(-8) || 'UNSYNCED'}</div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className={`text-xs font-bold px-2.5 py-1 rounded-lg border uppercase tracking-[0.1em] font-display ${
              isHighRisk ? 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'bg-orange-500/10 text-orange-400 border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.1)]'
            }`}>
              {(esc.churn_risk * 100).toFixed(0)}% Risk
            </div>
            {isGovernance && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#c5f82a]/10 border border-[#c5f82a]/20 rounded text-[8px] font-bold text-[#c5f82a] uppercase tracking-widest font-display">
                <Shield size={8} />
                Governance Fault
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 relative z-10">
          <div className="text-[11px] text-white/50 font-bold uppercase tracking-[0.2em] mb-3 font-display">Escalation Logic</div>
          <div className="text-xs text-gray-400 bg-[#060c08]/50 border border-white/5 p-4 rounded-2xl font-mono leading-relaxed h-24 overflow-hidden italic text-pretty">
            "{esc.reason || 'Unspecified business rule violation requiring manual audit.'}"
          </div>
        </div>

        <button 
          onClick={onClaim}
          className="w-full mt-6 py-4 bg-[#1a281e] hover:bg-[#c5f82a] text-[#c5f82a] hover:text-[#0a110b] border border-[#c5f82a]/20 rounded-2xl text-[11px] font-bold uppercase tracking-[0.25em] font-display transition-all relative z-10 hover:shadow-[0_0_20px_rgba(197,248,42,0.2)] active:scale-[0.98]"
        >
          Claim Ownership
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#0a110b] border border-[#1a281e] p-5 rounded-2xl hover:border-[#c5f82a]/30 transition-all flex items-center gap-6 group">
      <div className={`w-1 h-10 rounded-full ${isGovernance ? 'bg-[#c5f82a]' : isHighRisk ? 'bg-red-500' : 'bg-orange-500'} opacity-50 group-hover:opacity-100 transition-opacity`} />
      
      <div className="w-44">
        <div className="flex items-center gap-2">
          <div className="text-xs font-bold text-white uppercase tracking-widest font-display">{esc.user_id}</div>
          {isGovernance && <Shield size={10} className="text-[#c5f82a]" />}
        </div>
        <div className="text-[10px] text-white/30 mt-0.5 font-mono tracking-tighter">{new Date(esc.executed_at).toLocaleTimeString()} • {new Date(esc.executed_at).toLocaleDateString()}</div>
      </div>

      <div className="flex-1">
        <div className="text-[10px] text-white/20 font-bold uppercase tracking-[0.15em] mb-1 font-display">Handover Reason</div>
        <div className="text-[11px] text-gray-400 truncate max-w-md font-mono italic">
          "{esc.reason || 'Agent handover requested'}"
        </div>
      </div>

      <div className="w-32 text-center">
        <div className="text-[10px] text-white/20 font-bold uppercase tracking-[0.15em] mb-1 font-display">Churn Risk</div>
        <div className={`text-sm font-bold font-mono tracking-tight ${isHighRisk ? 'text-red-400' : 'text-orange-400'}`}>
          {(esc.churn_risk * 100).toFixed(1)}%
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button 
          onClick={onClaim}
          className="px-8 py-3.5 bg-[#c5f82a]/5 hover:bg-[#c5f82a] text-[#c5f82a] hover:text-[#0a110b] border border-[#c5f82a]/30 rounded-2xl text-[11px] font-bold uppercase tracking-[0.25em] font-display transition-all whitespace-nowrap hover:shadow-[0_0_20px_rgba(197,248,42,0.2)] active:scale-[0.98]"
        >
          Claim Case
        </button>

        <button 
          onClick={() => triggerAction(`Additional options for ${esc.user_id}`)}
          className="p-2.5 text-white/20 hover:text-white transition-colors border border-transparent hover:border-white/5 rounded-xl"
        >
          <MoreVertical size={16} />
        </button>
      </div>
    </div>
  );
};

export default AdminManagementDashboard;
