import React, { useState } from 'react';
import { useRetro } from '../context/RetroContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { playClick } from '../utils/sound';
import { ListChecks, ArrowLeft, ArrowRight, CheckCircle2, Clock, User, AlertCircle, MessageSquare } from 'lucide-react';

export const PrevActionsPhase: React.FC = () => {
  const { 
    teams, 
    selectedTeamId, 
    previousActionItems, 
    updatePrevActionItemStatus, 
    nextPhase, 
    prevPhase,
    currentRetro,
    currentUserMemberId
  } = useRetro();

  const team = teams.find(t => t.id === selectedTeamId) || teams[0];
  const isFacilitator = !currentRetro?.createdBy || currentRetro.createdBy === currentUserMemberId;
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  const handleStatusChange = (itemId: string, status: 'Open' | 'In Progress' | 'Resolved') => {
    playClick();
    updatePrevActionItemStatus(itemId, status);
  };

  const handleSaveComment = (itemId: string, status: 'Open' | 'In Progress' | 'Resolved') => {
    playClick();
    updatePrevActionItemStatus(itemId, status, commentDrafts[itemId] ?? '');
  };

  const getMemberDetails = (mId: string) => {
    const member = team.members.find(m => m.id === mId);
    return member ? { name: member.name, emoji: member.emoji } : { name: 'Unknown Member', emoji: '👤' };
  };

  const totalItems = previousActionItems.length;
  const resolvedItems = previousActionItems.filter(item => item.status === 'Resolved').length;
  const inProgressItems = previousActionItems.filter(item => item.status === 'In Progress').length;
  const openItems = previousActionItems.filter(item => item.status === 'Open').length;

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h1 className="title-large flex items-center gap-3">
            <ListChecks className="w-9 h-9 text-indigo-400" />
            Previous Action Items
          </h1>
          <p className="subtitle">Let's check in on the commitments we made in our last retrospective session.</p>
        </div>

        <div className="flex items-center gap-3">
          {isFacilitator ? (
            <>
              <Button variant="outline" size="sm" onClick={prevPhase} icon={<ArrowLeft className="w-4 h-4" />}>
                Back
              </Button>
              <Button
                variant="success"
                size="sm"
                onClick={nextPhase}
                icon={<ArrowRight className="w-4 h-4" />}
                iconRight
                glow
              >
                Health Check
              </Button>
            </>
          ) : (
            <span className="text-xs text-slate-400 italic bg-white/5 border border-white/5 px-3 py-1.5 rounded-lg">
              Waiting for facilitator...
            </span>
          )}
        </div>
      </div>

      {/* Stats Board */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card padding="sm" className="text-center">
          <span className="text-xs text-slate-400 block mb-1">Total Actions</span>
          <span className="text-2xl font-bold font-mono text-slate-100">{totalItems}</span>
        </Card>
        <Card padding="sm" className="text-center border-emerald-500/20">
          <span className="text-xs text-emerald-400/80 block mb-1">Resolved</span>
          <span className="text-2xl font-bold font-mono text-emerald-400">{resolvedItems}</span>
        </Card>
        <Card padding="sm" className="text-center border-amber-500/20">
          <span className="text-xs text-amber-400/80 block mb-1">In Progress</span>
          <span className="text-2xl font-bold font-mono text-amber-400">{inProgressItems}</span>
        </Card>
        <Card padding="sm" className="text-center border-rose-500/20">
          <span className="text-xs text-rose-400/80 block mb-1">Open / Delayed</span>
          <span className="text-2xl font-bold font-mono text-rose-400">{openItems}</span>
        </Card>
      </div>

      {/* Items list */}
      <Card padding="lg">
        {previousActionItems.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center justify-center gap-4">
            <CheckCircle2 className="w-16 h-16 text-emerald-500/20" />
            <div>
              <h2 className="text-xl font-bold mb-1">All caught up!</h2>
              <p className="text-sm text-slate-400">There are no previous action items logged for {team.name}.</p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                playClick();
                // Set default mock data items
                const saved = localStorage.getItem(`daki_prev_items_${selectedTeamId}`);
                if (!saved || JSON.parse(saved).length === 0) {
                  const defaultItems = [
                    {
                      id: 'demo-pa-1',
                      description: 'Configure Vite cache configuration in Github Actions file.',
                      assigneeId: team.members[0]?.id || 'unknown',
                      dueDate: '2026-06-15',
                      status: 'Open' as const,
                      createdInRetro: 'Retro #2'
                    },
                    {
                      id: 'demo-pa-2',
                      description: 'Schedule design sync before kickoff of Sprint 36 dashboard UI features.',
                      assigneeId: team.members[1]?.id || 'unknown',
                      dueDate: '2026-06-12',
                      status: 'In Progress' as const,
                      createdInRetro: 'Retro #2'
                    }
                  ];
                  localStorage.setItem(`daki_prev_items_${selectedTeamId}`, JSON.stringify(defaultItems));
                  // force reload team selection by changing selectedTeamId briefly or updating manually
                  window.location.reload();
                }
              }}
            >
              Generate Demo Action Items
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {previousActionItems.map(item => {
              const assignee = getMemberDetails(item.assigneeId);
              
              return (
                <div 
                  key={item.id}
                  className="p-3.5 bg-slate-950/40 border border-white/5 rounded-xl flex flex-col items-start gap-3 hover:bg-slate-950/60 transition-all duration-200"
                >
                  <div className="flex-1 min-w-0 w-full">
                    <p className="text-sm font-semibold text-slate-100 mb-1 leading-relaxed">
                      {item.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-400">
                      <span className="flex items-center gap-1.5 bg-slate-900 px-2 py-0.5 rounded border border-white/5">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-[10px]">{assignee.emoji}</span>
                        <span className="font-medium text-slate-300">{assignee.name}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        Due: <span className="font-semibold text-slate-300">{item.dueDate}</span>
                      </span>
                      <span>•</span>
                      <span className="text-[10px] text-slate-500 bg-white/5 px-2 py-0.5 rounded">
                        {item.createdInRetro}
                      </span>
                    </div>

                    <div className="mt-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" />
                        Progress Comment
                      </label>
                      <div className="flex flex-col gap-2">
                        <textarea
                          value={commentDrafts[item.id] ?? item.progressComment ?? ''}
                          onChange={(e) => setCommentDrafts(prev => ({ ...prev, [item.id]: e.target.value }))}
                          rows={2}
                          placeholder="Add latest progress update, blocker, or next step..."
                          className="form-input text-xs py-2 bg-slate-900 w-full resize-none"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 w-full"
                          onClick={() => handleSaveComment(item.id, item.status)}
                        >
                          Save Comment
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Status Button selectors */}
                  <div className="flex items-center gap-1.5 shrink-0 bg-slate-900/50 p-1 border border-white/5 rounded-xl">
                    <button
                      onClick={() => handleStatusChange(item.id, 'Open')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all duration-200
                        ${item.status === 'Open' 
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/20' 
                          : 'text-slate-400 hover:text-slate-200 border border-transparent'
                        }
                      `}
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      Open
                    </button>
                    <button
                      onClick={() => handleStatusChange(item.id, 'In Progress')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all duration-200
                        ${item.status === 'In Progress' 
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20' 
                          : 'text-slate-400 hover:text-slate-200 border border-transparent'
                        }
                      `}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      In Progress
                    </button>
                    <button
                      onClick={() => handleStatusChange(item.id, 'Resolved')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all duration-200
                        ${item.status === 'Resolved' 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.15)]' 
                          : 'text-slate-400 hover:text-slate-200 border border-transparent'
                        }
                      `}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Resolved
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};
