import React, { useState } from 'react';
import { useRetro } from '../context/RetroContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { type DakiCard } from '../utils/mockData';
import { playClick, playSuccess } from '../utils/sound';
import { TrendingUp, ArrowLeft, ArrowRight, Calendar, PlusCircle, CheckCircle, FileText, ClipboardList } from 'lucide-react';

export const PrioritizePhase: React.FC = () => {
  const { 
    currentRetro, 
    teams, 
    selectedTeamId, 
    addActionItem, 
    nextPhase, 
    prevPhase,
    currentUserMemberId
  } = useRetro();

  const team = teams.find(t => t.id === selectedTeamId) || teams[0];
  const isFacilitator = !currentRetro?.createdBy || currentRetro.createdBy === currentUserMemberId;
  
  // Sorted cards by votes (highest first)
  const sortedCards = [...(currentRetro?.dakiCards || [])].sort((a, b) => b.votes - a.votes);

  // Modal/form state for generating action item from card
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [actionDesc, setActionDesc] = useState('');
  const [actionDescDetail, setActionDescDetail] = useState('');
  const [actionAssignee, setActionAssignee] = useState(team.members[0]?.id || '');
  const [actionDate, setActionDate] = useState('');

  const handleOpenActionForm = (card: DakiCard) => {
    playClick();
    setActiveCardId(card.id);
    // Prefill description with card text
    setActionDesc(card.content);
    // Prefill description detail with card description
    setActionDescDetail(card.description || '');
    // Prefill date with 1 week from now
    const oneWeek = new Date();
    oneWeek.setDate(oneWeek.getDate() + 7);
    setActionDate(oneWeek.toISOString().split('T')[0]);
  };

  const handleSaveActionItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionDesc.trim()) return;

    playSuccess();
    addActionItem(actionDesc, actionAssignee, actionDate, actionDescDetail);
    setActiveCardId(null);
    setActionDesc('');
    setActionDescDetail('');
  };

  const getAssigneeEmoji = (mId: string) => {
    const member = team.members.find(m => m.id === mId);
    return member?.emoji || '👤';
  };

  const getAssigneeName = (mId: string) => {
    const member = team.members.find(m => m.id === mId);
    return member?.name || 'Unknown';
  };

  const getColumnTag = (col: string) => {
    switch (col) {
      case 'drop': return '🛑 Drop';
      case 'add': return '➕ Add';
      case 'keep': return '⭐ Keep';
      case 'improve': return '⚙️ Improve';
      default: return col;
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h1 className="title-large flex items-center gap-3">
            <TrendingUp className="w-9 h-9 text-indigo-400" />
            Prioritize & Action Items
          </h1>
          <p className="subtitle">Convert top voted ideas into clear, assignable action items with due dates.</p>
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
                Star of Release
              </Button>
            </>
          ) : (
            <span className="text-xs text-slate-400 italic bg-white/5 border border-white/5 px-3 py-1.5 rounded-lg">
              Waiting for facilitator...
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Top-voted DAKI cards list */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <Card padding="lg" className="flex-1">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4 border-b border-white/5 pb-3">
              <ClipboardList className="w-5 h-5 text-indigo-400" />
              Top Feedback Cards
            </h2>

            {sortedCards.length === 0 ? (
              <div className="text-center py-16 text-slate-500 text-sm">
                No cards added in the DAKI board phase.
              </div>
            ) : (
              <div className="flex flex-col gap-3.5 max-h-[480px] overflow-y-auto pr-1">
                {sortedCards.map(card => {
                  const isFormOpen = activeCardId === card.id;
                  const alreadyConverted = currentRetro?.actionItems.some(
                    item => item.description.toLowerCase().trim() === card.content.toLowerCase().trim()
                  );

                  return (
                    <div 
                      key={card.id}
                      className={`p-4 bg-slate-950/40 border rounded-xl flex flex-col gap-3 transition-all duration-200
                        ${isFormOpen 
                          ? 'border-indigo-500/40 ring-1 ring-indigo-500/20' 
                          : alreadyConverted 
                            ? 'border-emerald-500/10 opacity-75' 
                            : 'border-white/5 hover:border-white/10'
                        }
                      `}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="text-[10px] font-semibold text-slate-400 bg-white/5 border border-white/5 px-2 py-0.5 rounded">
                              {getColumnTag(card.column)}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium">
                              Category: {card.category}
                            </span>
                            <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.2 rounded font-bold">
                              👍 {card.votes} Votes
                            </span>
                          </div>
                          
                          <p className="text-xs text-slate-200 leading-relaxed font-semibold">
                            {card.content}
                          </p>
                        </div>

                        {!isFormOpen && (
                          <Button
                            variant={alreadyConverted ? 'outline' : 'primary'}
                            size="sm"
                            disabled={alreadyConverted}
                            onClick={() => handleOpenActionForm(card)}
                            className="h-8 px-3 text-xs shrink-0"
                            icon={<PlusCircle className="w-3.5 h-3.5" />}
                          >
                            {alreadyConverted ? 'Added' : 'Convert'}
                          </Button>
                        )}
                      </div>

                      {/* Convert Form */}
                      {isFormOpen && (
                        <form onSubmit={handleSaveActionItem} className="border-t border-white/5 pt-3 mt-1 flex flex-col gap-3.5 animate-fade-in">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                              Action Item Summary
                            </label>
                            <input
                              type="text"
                              value={actionDesc}
                              onChange={e => setActionDesc(e.target.value)}
                              required
                              className="form-input text-xs py-2 bg-slate-900"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                              Description Details
                            </label>
                            <textarea
                              value={actionDescDetail}
                              onChange={e => setActionDescDetail(e.target.value)}
                              className="form-input text-xs py-2 bg-slate-900 min-h-[60px]"
                              placeholder="Add more details about this action item..."
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Assignee</label>
                              <select
                                value={actionAssignee}
                                onChange={e => setActionAssignee(e.target.value)}
                                className="form-select text-xs py-2 bg-slate-900"
                              >
                                {team.members.map(m => (
                                  <option key={m.id} value={m.id}>{m.emoji} {m.name}</option>
                                ))}
                              </select>
                            </div>

                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Due Date</label>
                              <input
                                type="date"
                                value={actionDate}
                                onChange={e => setActionDate(e.target.value)}
                                required
                                className="form-input text-xs py-1.5 bg-slate-900"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-1">
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm" 
                              onClick={() => { playClick(); setActiveCardId(null); }}
                              className="h-8 text-xs"
                            >
                              Cancel
                            </Button>
                            <Button 
                              type="submit" 
                              variant="success" 
                              size="sm"
                              className="h-8 text-xs"
                              glow
                            >
                              Save Action
                            </Button>
                          </div>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Generated action items list */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <Card padding="lg" className="h-full flex flex-col">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4 border-b border-white/5 pb-3">
              <FileText className="w-5 h-5 text-emerald-400" />
              New Action Items ({currentRetro?.actionItems.length || 0})
            </h2>

            <div className="flex-1 overflow-y-auto max-h-[400px] pr-1 flex flex-col gap-3">
              {!currentRetro?.actionItems || currentRetro.actionItems.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500 py-12 gap-2">
                  <CheckCircle className="w-10 h-10 opacity-20 text-slate-400" />
                  <p className="text-xs font-semibold">No action items defined yet.</p>
                  <p className="text-[11px] leading-relaxed max-w-[200px]">Click "Convert" on any card on the left to assign task scopes.</p>
                </div>
              ) : (
                currentRetro.actionItems.map(item => (
                  <div 
                    key={item.id}
                    className="p-3 bg-white/5 border border-white/5 rounded-xl flex flex-col gap-2 hover:bg-white/10 transition-all duration-200"
                  >
                    <p className="text-xs font-semibold text-slate-100 leading-relaxed">
                      {item.description}
                    </p>
                    {item.descriptionDetail && (
                      <p className="text-[10px] text-slate-400 leading-relaxed bg-black/20 p-2 rounded border border-white/5 whitespace-pre-wrap">
                        {item.descriptionDetail}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 border-t border-white/5 pt-2">
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="text-xs shrink-0">{getAssigneeEmoji(item.assigneeId)}</span>
                        <span className="truncate font-semibold text-slate-300">{getAssigneeName(item.assigneeId)}</span>
                      </div>
                      <span className="flex items-center gap-1 font-mono text-[9px] text-slate-400">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {item.dueDate}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
