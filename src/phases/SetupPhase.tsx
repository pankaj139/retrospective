import React, { useState } from 'react';
import { useRetro } from '../context/RetroContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { 
  Users, Plus, Play, History, Calendar, CheckCircle, 
  ArrowLeft, ArrowRight, UserPlus, ShieldCheck, HelpCircle 
} from 'lucide-react';
import { playClick } from '../utils/sound';

export const SetupPhase: React.FC = () => {
  const { 
    teams, 
    selectedTeamId, 
    selectTeam, 
    createTeam, 
    startRetro, 
    history,
    currentRetro,
    currentUserMemberId,
    setCurrentUserMemberId,
    addTeamMember,
    joinRetro,
    loading
  } = useRetro();

  const [activeTab, setActiveTab] = useState<'team' | 'user'>('team');
  
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

  const activeTeam = teams.find(t => t.id === selectedTeamId) || teams[0];
  const teamHistory = history.filter(h => h.teamId === selectedTeamId);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-sm gap-3">
        <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        <span>Synchronizing with Supabase Realtime...</span>
      </div>
    );
  }

  const handleStart = () => {
    playClick();
    startRetro();
  };

  const handleJoin = () => {
    playClick();
    joinRetro();
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
    setActiveTab('user'); // Go to user select next
  };

  const handleAddSelfSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

  return (
    <div className="w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 animate-fade-in">
      {/* Left Columns - Setup card */}
      <div className="md:col-span-2 flex flex-col gap-6">
        
        {/* Step Indicator Tabs header */}
        {!isCreatingTeam && (
          <div className="flex items-center gap-1 bg-slate-950/40 p-1 border border-white/5 rounded-xl">
            <button
              onClick={() => { playClick(); setActiveTab('team'); }}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-200
                ${activeTab === 'team' 
                  ? 'bg-indigo-600 text-white shadow-lg' 
                  : 'text-slate-400 hover:text-slate-200'
                }
              `}
            >
              <Users className="w-4 h-4" />
              1. Select Team
            </button>
            <button
              onClick={() => { if (teams.length > 0) { playClick(); setActiveTab('user'); } }}
              disabled={teams.length === 0}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-200
                ${activeTab === 'user' 
                  ? 'bg-indigo-600 text-white shadow-lg' 
                  : 'text-slate-400 hover:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed'
                }
              `}
            >
              <UserPlus className="w-4 h-4" />
              2. Select Self
            </button>
          </div>
        )}

        {/* Tab 1: Team setup & selector */}
        {activeTab === 'team' && (
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
                      <p className="text-[10px] text-emerald-500/80">Other teammates are online. Click continue to choose your identity and join.</p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Team Members ({activeTeam?.members.length})
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {activeTeam?.members.map(member => (
                      <div 
                        key={member.id}
                        className="flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-xl text-slate-300"
                      >
                        <span className="text-xl">{member.emoji}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate">{member.name}</p>
                          <p className="text-[9px] text-slate-500 truncate">{member.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 mt-2 flex justify-end">
                  {currentRetro ? (
                    <Button 
                      variant="success" 
                      onClick={() => { playClick(); setActiveTab('user'); }}
                      icon={<ArrowRight className="w-4 h-4" />}
                      iconRight
                      glow
                    >
                      Join Active Retro (Select Identity)
                    </Button>
                  ) : (
                    <Button 
                      variant="primary" 
                      onClick={() => { playClick(); setActiveTab('user'); }}
                      icon={<ArrowRight className="w-4 h-4" />}
                      iconRight
                    >
                      Continue to Select Self
                    </Button>
                  )}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Tab 2: User selector and join/create retro triggers */}
        {activeTab === 'user' && (
          <Card variant="brand" padding="lg">
            <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
              <div className="flex items-center gap-2.5">
                <button 
                  onClick={() => { playClick(); setActiveTab('team'); }}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    Identify Yourself
                  </h2>
                  <p className="text-[10px] text-slate-400">Choose who is sitting at this browser tab.</p>
                </div>
              </div>

              {!isAddingSelf && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  icon={<UserPlus className="w-3.5 h-3.5" />}
                  onClick={() => { playClick(); setIsAddingSelf(true); }}
                >
                  Add Myself
                </Button>
              )}
            </div>

            {isAddingSelf ? (
              <form onSubmit={handleAddSelfSubmit} className="flex flex-col gap-4 bg-slate-950/20 p-4 border border-white/5 rounded-xl mb-4 animate-fade-in">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400">Join Active Team List</h3>
                
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
                    Add & Select
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Click on your card to select yourself:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-56 overflow-y-auto pr-1">
                    {activeTeam?.members.map(member => {
                      const isMe = member.id === currentUserMemberId;
                      return (
                        <div 
                          key={member.id}
                          onClick={() => { playClick(); setCurrentUserMemberId(member.id); }}
                          className={`flex items-center gap-3 p-3 border rounded-xl hover:bg-white/10 hover:border-white/10 transition-all duration-200 cursor-pointer
                            ${isMe 
                              ? 'bg-indigo-600/15 border-indigo-500/40 ring-1 ring-indigo-500/25' 
                              : 'bg-white/5 border-white/5'
                            }
                          `}
                        >
                          <span className="text-2xl">{member.emoji}</span>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate flex items-center gap-1">
                              {member.name}
                              {isMe && <span className="text-[8px] bg-indigo-500 text-white font-normal px-1 rounded">YOU</span>}
                            </p>
                            <p className="text-[9px] text-slate-500 truncate">{member.role}</p>
                          </div>
                        </div>
                      );
                    })}
                    {/* Add Myself card at the end of the grid */}
                    <div 
                      onClick={() => { playClick(); setIsAddingSelf(true); }}
                      className="flex items-center justify-center gap-2 p-3 border border-dashed border-indigo-500/30 hover:border-indigo-500/60 bg-indigo-500/5 hover:bg-indigo-500/10 rounded-xl cursor-pointer transition-all text-indigo-400 hover:text-indigo-300 min-h-[60px]"
                    >
                      <UserPlus className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs font-bold">Add Myself</span>
                    </div>
                  </div>
                </div>

                {/* Confirm Active Session Prompt */}
                {currentRetro ? (
                  <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-emerald-400">RETRO IS RUNNING FOR {activeTeam?.name.toUpperCase()}</h4>
                      <p className="text-[10px] text-emerald-500/80 leading-relaxed mt-0.5">
                        Active Date: {currentRetro.date}. Join in and collaborate in real-time.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 bg-slate-950/40 border border-white/5 rounded-xl flex items-start gap-3">
                    <HelpCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-indigo-400">NO SESSION CURRENTLY RUNNING</h4>
                      <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">
                        You will host a new session. Other team members can join your session once you start it.
                      </p>
                    </div>
                  </div>
                )}

                {/* Big Action Join Button */}
                <div className="pt-4 border-t border-white/5 mt-2 flex flex-col items-center gap-3">
                  {!currentUserMemberId && (
                    <p className="text-xs text-rose-400 font-semibold animate-pulse">
                      ⚠️ Please select yourself from the list or click "Add Myself" to proceed.
                    </p>
                  )}
                  {currentRetro ? (
                    <Button 
                      variant="success" 
                      size="lg" 
                      glow 
                      icon={<Play className="w-5 h-5 fill-current" />}
                      onClick={handleJoin}
                      disabled={!currentUserMemberId}
                      className="w-full sm:w-auto px-10 py-4 text-base font-bold tracking-wider uppercase animate-pulse-glow"
                    >
                      Join Active Retrospective
                    </Button>
                  ) : (
                    <Button 
                      variant="primary" 
                      size="lg" 
                      glow 
                      icon={<Play className="w-5 h-5 fill-current" />}
                      onClick={handleStart}
                      disabled={!currentUserMemberId}
                      className="w-full sm:w-auto px-10 py-4 text-base font-bold tracking-wider uppercase animate-pulse-glow"
                    >
                      Start Retrospective
                    </Button>
                  )}
                </div>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Right Column - Team History */}
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
                  className="p-3.5 bg-slate-950/40 border border-white/5 rounded-xl flex flex-col gap-2 hover:bg-slate-950/60 transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                      Retro Archive
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
    </div>
  );
};
