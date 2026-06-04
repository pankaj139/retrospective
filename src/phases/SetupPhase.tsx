import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useRetro } from '../context/RetroContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import {
  Users, Plus, Play, History, Calendar, CheckCircle,
  UserPlus, ShieldCheck,
  X, Star, Heart, CheckSquare, Bot, Activity,
  Mail, Lock, LayoutGrid
} from 'lucide-react';
import { playClick } from '../utils/sound';
import { 
  type RetroSession, 
  HEALTH_METRICS, 
  AI_ADOPTION_QUESTIONS 
} from '../utils/mockData';


export const SetupPhase: React.FC = () => {
  const { 
    teams, 
    selectedTeamId, 
    selectTeam, 
    createTeam, 
    startRetro, 
    history,
    currentRetro,
    addTeamMember,
    approveTeamMember,
    rejectTeamMember,
    authUser,
    signInWithPassword,
    signUpWithPassword,
    joinRetro,
    scheduleRetro,
    startScheduledRetro,
    currentUserMemberId,
    loading
  } = useRetro();

  const [selectedHistoryRetro, setSelectedHistoryRetro] = useState<RetroSession | null>(null);
  const [modalTab, setModalTab] = useState<'overview' | 'daki' | 'actions'>('overview');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleName, setScheduleName] = useState('');
  const [scheduleJira, setScheduleJira] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  
  // Team creation states
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamEmoji, setNewTeamEmoji] = useState('🚀');
  const [newMembers, setNewMembers] = useState<Array<{ name: string; role: string; emoji: string }>>([
    { name: '', role: 'Developer', emoji: '🧑‍💻' }
  ]);

  // Dynamic self-addition states
  const [isAddingSelf, setIsAddingSelf] = useState(false);
  const [selfName, setSelfName] = useState('');
  const [selfRole, setSelfRole] = useState('Developer');
  const [selfEmoji, setSelfEmoji] = useState('🧑‍💻');
  const [authMode, setAuthMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authNotice, setAuthNotice] = useState('');

  const activeTeam = teams.find(t => t.id === selectedTeamId) || teams[0];
  const pendingMembers = activeTeam?.pendingMembers || [];
  const approvedMemberForAuth = activeTeam?.members.find(member => {
    if (!authUser) return false;
    return (member.userId === authUser.id)
      || (activeTeam.ownerUserId === authUser.id && activeTeam.ownerMemberId === member.id);
  });
  const selectedPendingMember = pendingMembers.find(member => member.userId === authUser?.id);
  const hasApprovedAccess = Boolean(approvedMemberForAuth);
  const hasPendingAccess = Boolean(selectedPendingMember);
  const canApproveMembers = Boolean(
    activeTeam
    && authUser
    && (
      activeTeam.ownerUserId === authUser.id
      || hasApprovedAccess
    )
  );
  const isAuthenticated = Boolean(authUser);
  const teamHistory = history.filter(h => h.teamId === selectedTeamId);
  const isTeamOwner = Boolean(
    activeTeam && authUser && (
      activeTeam.ownerUserId === authUser.id || activeTeam.ownerMemberId === currentUserMemberId
    )
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-sm gap-3">
        <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        <span>Synchronizing with Supabase Realtime...</span>
      </div>
    );
  }

  const handleStart = () => {
    const defaultName = `${activeTeam?.name || 'Team'} Retro - ${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
    const nameInput = window.prompt("Enter a name for this retrospective session:", defaultName);
    if (nameInput === null) return; // user cancelled starting retro
    playClick();
    startRetro(nameInput.trim() || undefined);
  };

  const handleJoin = () => {
    playClick();
    joinRetro();
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleDate) return;
    playClick();
    const formattedDate = new Date(scheduleDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    await scheduleRetro(formattedDate, scheduleName.trim() || undefined, scheduleJira.trim() || undefined);
    setShowScheduleModal(false);
    setScheduleDate('');
    setScheduleName('');
    setScheduleJira('');
  };

  const handleAddMemberField = () => {
    playClick();
    const emojis = ['🧑‍💻', '👩‍🎨', '🧙‍♂️', '🕵️‍♀️', '🤖', '🍎', '🎨', '👩‍💼', '💼', '🚀'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    setNewMembers([...newMembers, { name: '', role: 'Developer', emoji: randomEmoji }]);
  };

  const handleRemoveMemberField = (idx: number) => {
    playClick();
    setNewMembers(newMembers.filter((_, i) => i !== idx));
  };

  const handleMemberChange = (idx: number, field: 'name' | 'role' | 'emoji', value: string) => {
    const updated = [...newMembers];
    updated[idx] = { ...updated[idx], [field]: value };
    setNewMembers(updated);
  };

  const handleCreateTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) return;
    if (!newTeamName.trim()) return;
    const membersToCreate = newMembers.filter(m => m.name.trim() !== '');
    if (membersToCreate.length === 0) return;

    playClick();
    const fullName = `${newTeamEmoji} ${newTeamName.trim()}`;
    await createTeam(fullName, membersToCreate);
    setIsCreatingTeam(false);
    setNewTeamName('');
    setNewTeamEmoji('🚀');
    setNewMembers([{ name: '', role: 'Developer', emoji: '🧑‍💻' }]);
  };

  const handleAddSelfSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) return;
    if (!selfName.trim()) return;

    playClick();
    const newMember = await addTeamMember(selectedTeamId, selfName, selfRole, selfEmoji);
    if (newMember) {
      setSelfName('');
      setSelfRole('Developer');
      setSelfEmoji('🧑‍💻');
      setIsAddingSelf(false);
    }
  };

  const handleApproveMember = async (memberId: string) => {
    playClick();
    await approveTeamMember(selectedTeamId, memberId);
  };

  const handleRejectMember = async (memberId: string) => {
    playClick();
    await rejectTeamMember(selectedTeamId, memberId);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthNotice('');

    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError('Email and password are required.');
      return;
    }

    playClick();
    const result = authMode === 'sign-in'
      ? await signInWithPassword(authEmail.trim(), authPassword)
      : await signUpWithPassword(authEmail.trim(), authPassword);

    if (!result.ok) {
      setAuthError(result.error || 'Authentication failed.');
      return;
    }

    if (authMode === 'sign-up') {
      setAuthNotice('Account created. If email confirmation is enabled, please verify your inbox.');
    } else {
      setAuthNotice('Signed in successfully.');
    }

    setAuthPassword('');
  };

  if (!isAuthenticated) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div>
            <div className="auth-logo-badge">
              <LayoutGrid className="w-6 h-6 text-white" />
            </div>
            <h2 className="auth-header-title">Welcome to DAKI Retro Hub</h2>
            <p className="auth-header-desc">Sign in or create an account to start your collaborative retrospectives.</p>
          </div>

          <div className="auth-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={authMode === 'sign-in'}
              onClick={() => { playClick(); setAuthMode('sign-in'); }}
              className={`auth-tab-btn ${authMode === 'sign-in' ? 'active' : ''}`}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={authMode === 'sign-up'}
              onClick={() => { playClick(); setAuthMode('sign-up'); }}
              className={`auth-tab-btn ${authMode === 'sign-up' ? 'active' : ''}`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="auth-form">
            <div className="auth-input-group">
              <label className="auth-input-label">Email Address</label>
              <div className="auth-input-wrapper">
                <Mail className="auth-input-icon w-4 h-4" />
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  className="auth-input-field"
                  required
                />
              </div>
            </div>

            <div className="auth-input-group">
              <label className="auth-input-label">Password</label>
              <div className="auth-input-wrapper">
                <Lock className="auth-input-icon w-4 h-4" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                  className="auth-input-field"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button type="submit" className="auth-submit-btn">
              {authMode === 'sign-in' ? 'Continue' : 'Create Account'}
            </button>
          </form>

          {authError && (
            <div className="auth-alert-error">
              {authError}
            </div>
          )}
          {authNotice && (
            <div className="auth-alert-notice">
              {authNotice}
            </div>
          )}
        </div>
      </div>
    );
  }

  const renderHistoryDetailModal = () => {
    if (!selectedHistoryRetro) return null;
    
    const retroTeam = teams.find(t => t.id === selectedHistoryRetro.teamId);
    const teamName = retroTeam?.name || 'Team';
    
    const dakiCount = selectedHistoryRetro.dakiCards?.length || 0;
    const actionCount = selectedHistoryRetro.actionItems?.length || 0;
    const memberFeedbackEntries = Object.entries(selectedHistoryRetro.memberRetroFeedback || {}).filter(([, text]) => text.trim());
    
    const getHealthAverage = (metricId: string) => {
      const scores: number[] = [];
      Object.values(selectedHistoryRetro.healthCheckScores || {}).forEach(mScores => {
        if (mScores[metricId] !== undefined) {
          scores.push(mScores[metricId]);
        }
      });
      return scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
        : 0;
    };

    const getAiAverage = (questionId: string) => {
      const scores: number[] = [];
      Object.values(selectedHistoryRetro.aiAdoptionScores || {}).forEach(mScores => {
        if (mScores[questionId] !== undefined) {
          scores.push(mScores[questionId]);
        }
      });
      return scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
        : 0;
    };
    
    const getProgressBarColor = (score: number) => {
      if (score === 0) return 'bg-slate-700';
      if (score < 2.5) return 'bg-rose-500';
      if (score < 3.5) return 'bg-amber-500';
      return 'bg-emerald-500';
    };

    const getCategoryBadgeClass = (cat: string) => {
      switch (cat.toLowerCase()) {
        case 'code': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
        case 'testing': return 'bg-violet-500/10 text-violet-400 border-violet-500/20';
        case 'process': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
        case 'documentation': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
        default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      }
    };

    const modalContent = (
      <div 
        className="fixed inset-0 flex items-center justify-center z-50 p-4"
        style={{ background: 'rgba(0, 0, 0, 0.88)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
        onClick={() => setSelectedHistoryRetro(null)}
      >
        <div 
          className="rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-6"
          style={{
            background: 'linear-gradient(145deg, #0f1523 0%, #0a0e1a 100%)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.05), 0 25px 80px rgba(0,0,0,0.8), 0 0 60px rgba(99,102,241,0.08)'
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 p-4">
            <div className="flex flex-col gap-1">
              <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-400" />
                Retrospective Details
              </h3>
              <p className="text-xs text-slate-400">
                {teamName} • Conducted on {selectedHistoryRetro.date}
              </p>
            </div>
            <button 
              onClick={() => setSelectedHistoryRetro(null)}
              className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-white/5 pb-2 gap-2 overflow-x-auto">
            <button
              onClick={() => { playClick(); setModalTab('overview'); }}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                modalTab === 'overview' 
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_12px_rgba(99,102,241,0.15)]' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <span className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Overview & Metrics
              </span>
            </button>
            <button
              onClick={() => { playClick(); setModalTab('daki'); }}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                modalTab === 'daki' 
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_12px_rgba(99,102,241,0.15)]' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <span className="flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-400" />
                DAKI Board ({dakiCount})
              </span>
            </button>
            <button
              onClick={() => { playClick(); setModalTab('actions'); }}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                modalTab === 'actions' 
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_12px_rgba(99,102,241,0.15)]' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <span className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-cyan-400" />
                Action Items ({actionCount})
              </span>
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 min-h-0">
            {modalTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Summary */}
                <div className="flex flex-col gap-6">
                  <div className="p-5 bg-slate-900/60 border border-white/5 rounded-2xl flex flex-col gap-4">
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                      Retro Score & Summary
                    </h4>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/25 px-3 py-1.5 rounded-xl text-amber-400 font-bold text-lg">
                        <Star className="w-5 h-5 fill-current" />
                        {selectedHistoryRetro.retroScore}/5
                      </div>
                      
                      <div className="text-xs text-slate-400 flex flex-col">
                        <span>Total DAKI Cards: <strong className="text-slate-200">{dakiCount}</strong></span>
                        <span>Total Action Items: <strong className="text-slate-200">{actionCount}</strong></span>
                      </div>
                    </div>

                    <div className="mt-2 p-4 bg-slate-950/40 border border-white/5 rounded-xl flex flex-col gap-3">
                      <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wide">
                        Final Team Feedback ({memberFeedbackEntries.length})
                      </div>

                      {memberFeedbackEntries.length > 0 ? (
                        <div className="max-h-[180px] overflow-y-auto pr-1 flex flex-col gap-2">
                          {memberFeedbackEntries.map(([memberId, text]) => {
                            const member = retroTeam?.members.find(m => m.id === memberId);
                            return (
                              <div key={memberId} className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5">
                                <div className="text-[11px] text-indigo-300 font-semibold mb-1">
                                  {member?.emoji || '👤'} {member?.name || 'Team Member'}
                                </div>
                                <p className="text-xs text-slate-300 whitespace-pre-wrap">{text}</p>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500 italic">
                          No final feedback entries were captured for this session.
                        </div>
                      )}

                      {selectedHistoryRetro.retroFeedback && (
                        <div className="pt-2 border-t border-white/5">
                          <span className="text-[10px] uppercase font-bold text-slate-500">Facilitator Summary</span>
                          <p className="text-xs text-slate-300 italic mt-1">"{selectedHistoryRetro.retroFeedback}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Additional info or game scores summary */}
                  {Object.keys(selectedHistoryRetro.gameScores || {}).length > 0 && (
                    <div className="p-5 bg-slate-900/60 border border-white/5 rounded-2xl flex flex-col gap-3">
                      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                        Warmup Game Top Scores
                      </h4>
                      <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1">
                        {Object.entries(selectedHistoryRetro.gameScores)
                          .sort(([, a], [, b]) => b - a)
                          .map(([mId, score]) => {
                            const member = retroTeam?.members.find(m => m.id === mId);
                            return (
                              <div key={mId} className="flex items-center justify-between text-xs py-1.5 border-b border-white/5 last:border-0">
                                <span className="flex items-center gap-1.5 text-slate-300">
                                  <span>{member?.emoji || '👤'}</span>
                                  <span>{member?.name || 'Anonymous Member'}</span>
                                </span>
                                <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                  {score} pts
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: Health and AI Metrics */}
                <div className="flex flex-col gap-6">
                  {/* Health Check Scores */}
                  <div className="p-5 bg-slate-900/60 border border-white/5 rounded-2xl flex flex-col gap-4">
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <Heart className="w-4 h-4 text-rose-400" />
                      Team Health Averages
                    </h4>
                    
                    <div className="flex flex-col gap-3.5">
                      {HEALTH_METRICS.map(metric => {
                        const avg = getHealthAverage(metric.id);
                        return (
                          <div key={metric.id} className="flex flex-col gap-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-300 font-semibold">{metric.name}</span>
                              <span className="font-mono font-bold text-slate-200">{avg > 0 ? `${avg}/5` : 'N/A'}</span>
                            </div>
                            <div className="w-full bg-slate-950/80 rounded-full h-2 overflow-hidden border border-white/5">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(avg)}`}
                                style={{ width: `${(avg / 5) * 100}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* AI Adoption Scores */}
                  <div className="p-5 bg-slate-900/60 border border-white/5 rounded-2xl flex flex-col gap-4">
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <Bot className="w-4 h-4 text-cyan-400" />
                      AI Adoption Averages
                    </h4>
                    
                    <div className="flex flex-col gap-3.5">
                      {AI_ADOPTION_QUESTIONS.map(question => {
                        const avg = getAiAverage(question.id);
                        return (
                          <div key={question.id} className="flex flex-col gap-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-300 font-semibold">{question.name}</span>
                              <span className="font-mono font-bold text-slate-200">{avg > 0 ? `${avg}/5` : 'N/A'}</span>
                            </div>
                            <div className="w-full bg-slate-950/80 rounded-full h-2 overflow-hidden border border-white/5">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(avg)}`}
                                style={{ width: `${(avg / 5) * 100}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {modalTab === 'daki' && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Drop Column */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between border-b border-rose-500/20 pb-1.5 px-1">
                    <h5 className="text-xs font-bold text-rose-400 uppercase tracking-wide">
                      🛑 DROP
                    </h5>
                    <span className="text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full font-bold">
                      {selectedHistoryRetro.dakiCards?.filter(c => c.column === 'drop').length || 0}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-1">
                    {(selectedHistoryRetro.dakiCards || []).filter(c => c.column === 'drop').length === 0 ? (
                      <div className="text-[11px] text-slate-600 text-center py-4">No cards</div>
                    ) : (
                      (selectedHistoryRetro.dakiCards || [])
                        .filter(c => c.column === 'drop')
                        .map(card => (
                          <div key={card.id} className="daki-card-item bg-rose-950/10 border-rose-500/10">
                            <p className="text-xs text-slate-200 whitespace-pre-wrap">{card.content}</p>
                            <div className="flex items-center justify-between mt-1 text-[10px]">
                              <span className={`px-1.5 py-0.5 rounded border ${getCategoryBadgeClass(card.category || 'General')}`}>
                                {card.category || 'General'}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-slate-400 flex items-center gap-0.5">
                                  <Star className="w-3 h-3 text-amber-400 fill-current" /> {card.votes}
                                </span>
                                <span className="text-slate-500 truncate max-w-[80px]" title={card.authorName}>
                                  {card.authorEmoji} {card.authorName}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>

                {/* Add Column */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between border-b border-emerald-500/20 pb-1.5 px-1">
                    <h5 className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                      ➕ ADD
                    </h5>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                      {selectedHistoryRetro.dakiCards?.filter(c => c.column === 'add').length || 0}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-1">
                    {(selectedHistoryRetro.dakiCards || []).filter(c => c.column === 'add').length === 0 ? (
                      <div className="text-[11px] text-slate-600 text-center py-4">No cards</div>
                    ) : (
                      (selectedHistoryRetro.dakiCards || [])
                        .filter(c => c.column === 'add')
                        .map(card => (
                          <div key={card.id} className="daki-card-item bg-emerald-950/10 border-emerald-500/10">
                            <p className="text-xs text-slate-200 whitespace-pre-wrap">{card.content}</p>
                            <div className="flex items-center justify-between mt-1 text-[10px]">
                              <span className={`px-1.5 py-0.5 rounded border ${getCategoryBadgeClass(card.category || 'General')}`}>
                                {card.category || 'General'}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-slate-400 flex items-center gap-0.5">
                                  <Star className="w-3 h-3 text-amber-400 fill-current" /> {card.votes}
                                </span>
                                <span className="text-slate-500 truncate max-w-[80px]" title={card.authorName}>
                                  {card.authorEmoji} {card.authorName}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>

                {/* Keep Column */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between border-b border-amber-500/20 pb-1.5 px-1">
                    <h5 className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                      ⭐ KEEP
                    </h5>
                    <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold">
                      {selectedHistoryRetro.dakiCards?.filter(c => c.column === 'keep').length || 0}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-1">
                    {(selectedHistoryRetro.dakiCards || []).filter(c => c.column === 'keep').length === 0 ? (
                      <div className="text-[11px] text-slate-600 text-center py-4">No cards</div>
                    ) : (
                      (selectedHistoryRetro.dakiCards || [])
                        .filter(c => c.column === 'keep')
                        .map(card => (
                          <div key={card.id} className="daki-card-item bg-amber-950/10 border-amber-500/10">
                            <p className="text-xs text-slate-200 whitespace-pre-wrap">{card.content}</p>
                            <div className="flex items-center justify-between mt-1 text-[10px]">
                              <span className={`px-1.5 py-0.5 rounded border ${getCategoryBadgeClass(card.category || 'General')}`}>
                                {card.category || 'General'}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-slate-400 flex items-center gap-0.5">
                                  <Star className="w-3 h-3 text-amber-400 fill-current" /> {card.votes}
                                </span>
                                <span className="text-slate-500 truncate max-w-[80px]" title={card.authorName}>
                                  {card.authorEmoji} {card.authorName}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>

                {/* Improve Column */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between border-b border-cyan-500/20 pb-1.5 px-1">
                    <h5 className="text-xs font-bold text-cyan-400 uppercase tracking-wide">
                      ⚙️ IMPROVE
                    </h5>
                    <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full font-bold">
                      {selectedHistoryRetro.dakiCards?.filter(c => c.column === 'improve').length || 0}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-1">
                    {(selectedHistoryRetro.dakiCards || []).filter(c => c.column === 'improve').length === 0 ? (
                      <div className="text-[11px] text-slate-600 text-center py-4">No cards</div>
                    ) : (
                      (selectedHistoryRetro.dakiCards || [])
                        .filter(c => c.column === 'improve')
                        .map(card => (
                          <div key={card.id} className="daki-card-item bg-cyan-950/10 border-cyan-500/10">
                            <p className="text-xs text-slate-200 whitespace-pre-wrap">{card.content}</p>
                            <div className="flex items-center justify-between mt-1 text-[10px]">
                              <span className={`px-1.5 py-0.5 rounded border ${getCategoryBadgeClass(card.category || 'General')}`}>
                                {card.category || 'General'}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-slate-400 flex items-center gap-0.5">
                                  <Star className="w-3 h-3 text-amber-400 fill-current" /> {card.votes}
                                </span>
                                <span className="text-slate-500 truncate max-w-[80px]" title={card.authorName}>
                                  {card.authorEmoji} {card.authorName}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {modalTab === 'actions' && (
              <div className="flex flex-col gap-4">
                {(selectedHistoryRetro.actionItems || []).length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm border border-dashed border-white/10 rounded-2xl">
                    <CheckSquare className="w-8 h-8 opacity-25 mx-auto mb-2" />
                    No Action Items were committed in this session.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-white/5 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-900/80 text-slate-400 border-b border-white/10 font-bold uppercase tracking-wider">
                          <th className="p-3">Description</th>
                          <th className="p-3">Assignee</th>
                          <th className="p-3">Due Date</th>
                          <th className="p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 bg-slate-950/20">
                        {(selectedHistoryRetro.actionItems || []).map(item => {
                          const assignee = retroTeam?.members.find(m => m.id === item.assigneeId);
                          return (
                            <tr key={item.id} className="hover:bg-white/5 transition-colors">
                              <td className="p-3 text-slate-200 font-medium">{item.description}</td>
                              <td className="p-3 text-slate-300">
                                {assignee ? (
                                  <span className="flex items-center gap-1.5">
                                    <span>{assignee.emoji}</span>
                                    <span>{assignee.name}</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-500">Unassigned / Unknown</span>
                                )}
                              </td>
                              <td className="p-3 font-mono text-slate-400">{item.dueDate}</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  item.status === 'Resolved' 
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : item.status === 'In Progress'
                                    ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                }`}>
                                  {item.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );

    return ReactDOM.createPortal(modalContent, document.body);
  };

  const renderScheduleModal = () => {
    const modalContent = (
      <div 
        className="fixed inset-0 flex items-center justify-center z-50 p-4"
        style={{ background: 'rgba(0, 0, 0, 0.88)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
        onClick={() => setShowScheduleModal(false)}
      >
        <div 
          className="rounded-2xl w-full max-w-md p-6 flex flex-col gap-4 bg-slate-900 border border-white/10"
          style={{
            background: 'linear-gradient(145deg, #0f1523 0%, #0a0e1a 100%)',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.05), 0 25px 80px rgba(0,0,0,0.8), 0 0 60px rgba(99,102,241,0.08)'
          }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-400" />
              Schedule Retrospective
            </h3>
            <button 
              onClick={() => setShowScheduleModal(false)}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleScheduleSubmit} className="flex flex-col gap-4 text-xs">
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Retro Name / Topic</label>
              <input
                type="text"
                placeholder="e.g. Summer Major Release Retro"
                required
                value={scheduleName}
                onChange={e => setScheduleName(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Jira Link (Optional)</label>
              <input
                type="text"
                placeholder="e.g. jira.company.com/issues/?filter=summer-release"
                value={scheduleJira}
                onChange={e => setScheduleJira(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Scheduled Date & Time</label>
              <input
                type="datetime-local"
                required
                value={scheduleDate}
                onChange={e => setScheduleDate(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-white/5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowScheduleModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
              >
                Schedule Session
              </Button>
            </div>
          </form>
        </div>
      </div>
    );

    return ReactDOM.createPortal(modalContent, document.body);
  };

  return (
    <div className="w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 animate-fade-in">

      {/* Left Columns - Setup card */}
      <div className="md:col-span-2 flex flex-col gap-6">

        {/* Team setup & selector */}
        <Card variant="brand" padding="lg">
            <div className="flex items-center justify-between mb-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-bold flex items-center gap-2.5">
                  <Users className="w-6 h-6 text-indigo-400" />
                  Select Your Team
                </h2>
              </div>
              {!isCreatingTeam && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  icon={<Plus className="w-4 h-4" />}
                  onClick={() => { playClick(); setIsCreatingTeam(true); }}
                  disabled={!isAuthenticated}
                >
                  New Team
                </Button>
              )}
            </div>

            {isCreatingTeam ? (
              <form onSubmit={handleCreateTeamSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Team Name</label>
                  <div className="flex gap-2">
                    <select
                      value={newTeamEmoji}
                      onChange={e => setNewTeamEmoji(e.target.value)}
                      className="form-select w-16 px-1 text-center text-lg bg-slate-950/60 border-indigo-500/20 rounded-xl"
                    >
                      {['🚀', '⚡', '🔥', '📱', '🌟', '🛡️', '🧪', '🎯', '🎨', '🔮', '🦄', '🦅', '🐺', '🦁'].map(emo => (
                        <option key={emo} value={emo}>{emo}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="e.g. Apollo Squad"
                      required
                      value={newTeamName}
                      onChange={e => setNewTeamName(e.target.value)}
                      className="form-input flex-1"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Team Members</label>
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm" 
                      onClick={handleAddMemberField}
                      className="h-7 px-2 text-xs"
                    >
                      Add Member
                    </Button>
                  </div>

                  <div className="flex flex-col gap-3 max-h-60 overflow-y-auto pr-1">
                    {newMembers.map((member, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <select
                          value={member.emoji}
                          onChange={e => handleMemberChange(idx, 'emoji', e.target.value)}
                          className="form-select w-16 px-1 text-center text-lg"
                        >
                          {['🧑‍💻', '👩‍🎨', '🧙‍♂️', '🕵️‍♀️', '🤖', '🍎', '🎨', '👩‍💼', '💼', '🚀', '🐱', '🐼', '🦊', '🦖'].map(emo => (
                            <option key={emo} value={emo}>{emo}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          placeholder="Name"
                          required
                          value={member.name}
                          onChange={e => handleMemberChange(idx, 'name', e.target.value)}
                          className="form-input flex-1"
                        />
                        <input
                          type="text"
                          placeholder="Role (e.g. Developer)"
                          value={member.role}
                          onChange={e => handleMemberChange(idx, 'role', e.target.value)}
                          className="form-input w-32"
                        />
                        {newMembers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMemberField(idx)}
                            className="text-rose-400 hover:text-rose-300 p-2"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => { playClick(); setIsCreatingTeam(false); }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary">
                    Save Team
                  </Button>
                </div>
              </form>
            ) : teams.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center gap-4 bg-slate-950/20 border border-white/5 rounded-xl">
                <Users className="w-12 h-12 text-indigo-400 opacity-40 animate-pulse" />
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold text-slate-300">No teams created yet</p>
                  <p className="text-xs text-slate-500 max-w-[280px]">Create your first team to start running retrospective sessions.</p>
                </div>
                <Button 
                  type="button"
                  variant="primary" 
                  size="sm" 
                  icon={<Plus className="w-4 h-4" />}
                  onClick={() => { playClick(); setIsCreatingTeam(true); }}
                  disabled={!isAuthenticated}
                >
                  Create First Team
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Active Team</label>
                  <select
                    value={selectedTeamId}
                    onChange={e => { playClick(); selectTeam(e.target.value); }}
                    className="form-select text-base font-semibold py-3 border-indigo-500/20 bg-slate-950/60"
                  >
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                {/* If session is active, highlight immediately */}
                {currentRetro && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 animate-pulse">
                    <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-emerald-400">Retro Session is Running!</p>
                      <p className="text-[10px] text-emerald-500/80">Other teammates are online. Approved members can join instantly.</p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Team Members ({activeTeam?.members.length || 0})
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {activeTeam?.members.map(member => (
                      <div 
                        key={member.id}
                        className="flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-xl text-slate-300"
                      >
                        <span className="text-xl">{member.emoji}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate flex items-center gap-1">
                            {member.name}
                            {activeTeam?.ownerMemberId === member.id && (
                              <span className="text-[8px] px-1 rounded bg-amber-400/20 text-amber-300 uppercase tracking-wide">Owner</span>
                            )}
                          </p>
                          <p className="text-[9px] text-slate-500 truncate">{member.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-slate-950/30 border border-white/5 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Pending Requests ({pendingMembers.length})
                    </label>
                    {canApproveMembers ? (
                      <span className="text-[10px] text-emerald-400">You can approve</span>
                    ) : (
                      <span className="text-[10px] text-slate-500">Owner/approved members can approve</span>
                    )}
                  </div>

                  {pendingMembers.length === 0 ? (
                    <p className="text-xs text-slate-500">No pending requests for this team.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {pendingMembers.map(member => (
                        <div key={member.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-white/5 bg-white/[0.02]">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-lg">{member.emoji}</span>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-200 truncate">{member.name}</p>
                              <p className="text-[10px] text-slate-500 truncate">{member.role}</p>
                            </div>
                          </div>
                          {canApproveMembers ? (
                            <div className="flex items-center gap-1">
                              <Button size="sm" variant="success" className="text-[10px] px-2 py-1" onClick={() => handleApproveMember(member.id)}>
                                Approve
                              </Button>
                              <Button size="sm" variant="outline" className="text-[10px] px-2 py-1" onClick={() => handleRejectMember(member.id)}>
                                Reject
                              </Button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-amber-400">Waiting approval</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {isAddingSelf && (
                  <form onSubmit={handleAddSelfSubmit} className="flex flex-col gap-4 bg-slate-950/20 p-4 border border-white/5 rounded-xl animate-fade-in">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400">Request Team Access</h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] text-slate-400 font-bold uppercase">Avatar</label>
                        <select
                          value={selfEmoji}
                          onChange={e => setSelfEmoji(e.target.value)}
                          className="form-select text-center text-lg py-1.5"
                        >
                          {['🧑‍💻', '👩‍🎨', '🧙‍♂️', '🕵️‍♀️', '🤖', '🍎', '🎨', '👩‍💼', '💼', '🚀', '🐱', '🐼', '🦊', '🦖'].map(emo => (
                            <option key={emo} value={emo}>{emo}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1 sm:col-span-2">
                        <label className="text-[9px] text-slate-400 font-bold uppercase">Your Full Name</label>
                        <input
                          type="text"
                          placeholder="e.g. John Doe"
                          required
                          value={selfName}
                          onChange={e => setSelfName(e.target.value)}
                          className="form-input py-1.5 text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Your Role</label>
                      <input
                        type="text"
                        placeholder="e.g. Developer, designer..."
                        value={selfRole}
                        onChange={e => setSelfRole(e.target.value)}
                        className="form-input py-1.5 text-xs"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-1 border-t border-white/5 mt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => { playClick(); setIsAddingSelf(false); }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" variant="success" size="sm">
                        Request Access
                      </Button>
                    </div>
                  </form>
                )}

                <div className="pt-4 border-t border-white/5 mt-2 flex flex-col items-end gap-3">
                  {hasPendingAccess && (
                    <p className="text-xs text-amber-400 font-semibold">
                      Access request pending approval.
                    </p>
                  )}

                  {!hasApprovedAccess && !hasPendingAccess && !isAddingSelf && (
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<UserPlus className="w-4 h-4" />}
                      onClick={() => { playClick(); setIsAddingSelf(true); }}
                    >
                      Request Access
                    </Button>
                  )}

                  {hasApprovedAccess && (
                    currentRetro ? (
                      currentRetro.status === 'scheduled' ? (
                        <div className="flex flex-col gap-4 w-full bg-slate-950/40 p-4 border border-white/5 rounded-xl text-left">
                          <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-indigo-400 animate-pulse shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-100 truncate">
                                {currentRetro.retroName || 'Upcoming Retrospective'}
                              </p>
                              <p className="text-[10px] text-slate-400">{currentRetro.date}</p>
                            </div>
                          </div>

                          {currentRetro.jiraLink && (
                            <div className="text-[11px] bg-slate-900/60 p-2 rounded-lg border border-white/5 flex items-center justify-between">
                              <span className="text-slate-400 truncate">Tickets / Jira Board:</span>
                              <a
                                href={currentRetro.jiraLink.startsWith('http') ? currentRetro.jiraLink : `https://${currentRetro.jiraLink}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-400 hover:text-indigo-300 font-semibold hover:underline shrink-0"
                              >
                                View Jira Board ↗
                              </a>
                            </div>
                          )}
                          
                          {/* Share Link */}
                          <div className="flex flex-col gap-1.5 border-t border-white/5 pt-3">
                            <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Share Link with Team</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                readOnly
                                value={`${window.location.origin}/?sessionId=${currentRetro.id}`}
                                className="form-input text-xs py-1.5 bg-slate-950/80 border-white/5 select-all"
                                onClick={e => (e.target as HTMLInputElement).select()}
                              />
                              <Button
                                size="sm"
                                variant="secondary"
                                className="py-1 px-3"
                                onClick={() => {
                                  playClick();
                                  navigator.clipboard.writeText(`${window.location.origin}/?sessionId=${currentRetro.id}`);
                                  setCopiedLink(true);
                                  setTimeout(() => setCopiedLink(false), 2000);
                                }}
                              >
                                {copiedLink ? 'Copied!' : 'Copy Link'}
                              </Button>
                            </div>
                          </div>

                          <div className="flex gap-2 justify-end mt-2 pt-3 border-t border-white/5">
                            {isTeamOwner && (
                              <Button
                                variant="success"
                                size="sm"
                                onClick={async () => {
                                  playClick();
                                  await startScheduledRetro();
                                }}
                                icon={<Play className="w-4 h-4 fill-current" />}
                                glow
                              >
                                Start Session Now
                              </Button>
                            )}
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={handleJoin}
                              icon={<Play className="w-4 h-4 fill-current" />}
                            >
                              Join Prep & Fill DAKI
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          variant="success"
                          onClick={handleJoin}
                          icon={<Play className="w-4 h-4 fill-current" />}
                          glow
                        >
                          Join Active Retrospective
                        </Button>
                      )
                    ) : (
                      isTeamOwner ? (
                        <div className="flex gap-3">
                          <Button
                            variant="primary"
                            onClick={handleStart}
                            icon={<Play className="w-4 h-4 fill-current" />}
                          >
                            Start Retrospective
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => { playClick(); setShowScheduleModal(true); }}
                            icon={<Calendar className="w-4 h-4" />}
                          >
                            Schedule Retro
                          </Button>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic font-semibold">
                          Waiting for Team Owner to start or schedule a retrospective.
                        </p>
                      )
                    )
                  )}
                </div>
              </div>
            )}
          </Card>

      </div>

      {/* Right Column - Team History */}
      {isAuthenticated && (
      <div className="flex flex-col gap-6">
        <Card padding="lg" className="h-full flex flex-col">
          <h2 className="text-xl font-bold flex items-center gap-2.5 mb-4">
            <History className="w-5 h-5 text-emerald-400" />
            Session History
          </h2>
          
          <div className="flex-1 overflow-y-auto max-h-[380px] pr-1 flex flex-col gap-3">
            {teamHistory.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500 py-10 gap-2">
                <CheckCircle className="w-10 h-10 opacity-30 text-slate-400" />
                <p className="text-sm">No retrospectives logged yet.</p>
                <p className="text-xs">Your completed sessions will appear here.</p>
              </div>
            ) : (
               teamHistory.map(session => (
                 <div 
                   key={session.id}
                   onClick={() => { playClick(); setSelectedHistoryRetro(session); setModalTab('overview'); }}
                   className="p-3.5 bg-slate-950/40 border border-white/5 rounded-xl flex flex-col gap-2 hover:bg-slate-950/60 cursor-pointer hover:border-indigo-500/50 hover:-translate-y-0.5 transition-all duration-200"
                 >

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full truncate max-w-[200px]" title={session.retroName || 'Retro Archive'}>
                      {session.retroName || 'Retro Archive'}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {session.date}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 pt-1">
                    <div>
                      <span className="text-slate-500">DAKI Cards:</span> {session.dakiCards.length}
                    </div>
                    <div>
                      <span className="text-slate-500">Action Items:</span> {session.actionItems.length}
                    </div>
                    <div>
                      <span className="text-slate-500">Effective Score:</span> {session.retroScore}/5 ⭐
                    </div>
                    <div>
                      <span className="text-slate-500">Final Feedback:</span> {Object.keys(session.memberRetroFeedback || {}).length}
                    </div>
                  </div>
                  
                  {session.retroFeedback && (
                    <div className="text-[11px] italic text-slate-400 border-t border-white/5 pt-1.5 mt-1">
                      "{session.retroFeedback}"
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
      )}
      {renderHistoryDetailModal()}
      {showScheduleModal && renderScheduleModal()}
    </div>
  );
};

