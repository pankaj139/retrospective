import React, { useState } from 'react';
import { useRetro } from '../context/RetroContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { playClick, playSuccess } from '../utils/sound';
import { Award, ArrowLeft, Trophy, Activity, LayoutGrid, FileText, CheckCircle, Star } from 'lucide-react';

export const ScorePhase: React.FC = () => {
  const { currentRetro, teams, selectedTeamId, setRetroScore, completeRetro, prevPhase, currentUserMemberId } = useRetro();
  const team = teams.find(t => t.id === selectedTeamId) || teams[0];
  const isFacilitator = !currentRetro?.createdBy || currentRetro.createdBy === currentUserMemberId;

  const [score, setScore] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [completed, setCompleted] = useState(false);

  const handleRatingSelect = (rate: number) => {
    playClick();
    setScore(rate);
  };

  const handleFinish = () => {
    playSuccess();
    setRetroScore(score, feedback);
    completeRetro();
    setCompleted(true);
  };

  // Find game high-scorer
  const getGameWinner = () => {
    if (!currentRetro) return null;
    let maxScore = -1;
    let winnerId = '';
    
    Object.entries(currentRetro.gameScores).forEach(([mId, pts]) => {
      if (pts > maxScore) {
        maxScore = pts;
        winnerId = mId;
      }
    });

    if (maxScore <= 0) return null;
    
    const member = team.members.find(m => m.id === winnerId);
    return member ? { name: member.name, emoji: member.emoji, score: maxScore } : null;
  };

  const winner = getGameWinner();

  if (completed) {
    return (
      <div className="w-full max-w-xl mx-auto flex flex-col gap-6 items-center justify-center text-center py-16 animate-fade-in">
        <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-2 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
          <CheckCircle className="w-10 h-10" />
        </div>
        
        <div>
          <h1 className="title-large text-3xl font-extrabold text-white mb-2">Retrospective Archived!</h1>
          <p className="subtitle text-sm max-w-sm">
            Excellent collaboration today. The session recap has been logged into team logs, and pending actions will carry forward.
          </p>
        </div>

        <Button 
          variant="primary" 
          size="lg" 
          onClick={() => { playClick(); window.location.reload(); }}
          glow
          className="mt-4 px-10"
        >
          Return to Setup
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h1 className="title-large flex items-center gap-3">
            <Award className="w-9 h-9 text-indigo-400" />
            Rate Retrospective
          </h1>
          <p className="subtitle">Rate the effectiveness of today's meeting and save the session logs.</p>
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
                onClick={handleFinish}
                icon={<CheckCircle className="w-4 h-4" />}
                glow
              >
                Archive Session
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
        {/* Rating selectors */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card padding="lg" className="flex flex-col gap-5 justify-center">
            <h2 className="text-lg font-bold border-b border-white/5 pb-3 text-center">
              Session ROI / Value
            </h2>
            
            <div className="flex justify-center items-center gap-3 py-4">
              {[1, 2, 3, 4, 5].map(rate => {
                const isSelected = rate <= score;
                return (
                  <button
                    key={rate}
                    onClick={() => handleRatingSelect(rate)}
                    className={`focus:outline-none transition-all duration-200 active:scale-95
                      ${isSelected ? 'text-amber-400 hover:text-amber-300' : 'text-slate-700 hover:text-slate-600'}
                    `}
                  >
                    <Star className={`w-10 h-10 ${isSelected ? 'fill-current' : ''}`} />
                  </button>
                );
              })}
            </div>

            <div className="text-center text-xs font-semibold text-amber-400 font-mono">
              {score === 1 && '😭 Wasted Time / Frustrated'}
              {score === 2 && '😕 Not useful / Repetitive'}
              {score === 3 && '😐 Average meeting quality'}
              {score === 4 && '🙂 Good discussions & outcomes'}
              {score === 5 && '🤩 Extremely valuable / Peak alignment'}
            </div>

            <div className="flex flex-col gap-1.5 mt-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                Optional Feedback / Notes
              </label>
              <textarea
                placeholder="What went well about this meeting? What could we improve for our next retro?"
                rows={3}
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                className="form-input text-xs leading-relaxed py-2.5"
              />
            </div>
          </Card>
        </div>

        {/* Dashboard Recap */}
        <div className="lg:col-span-3">
          <Card padding="lg" className="flex flex-col gap-6 h-full">
            <h2 className="text-lg font-bold border-b border-white/5 pb-3">
              Retro Session Recap Summary
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-grow">
              {/* Game Winner */}
              <div className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-center gap-3">
                <Trophy className="w-8 h-8 text-amber-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Game Champion</span>
                  {winner ? (
                    <p className="text-xs font-bold text-slate-100 truncate">
                      {winner.emoji} {winner.name} ({winner.score} pts)
                    </p>
                  ) : (
                    <p className="text-xs font-medium text-slate-500">No score recorded</p>
                  )}
                </div>
              </div>

              {/* Health Metrics Count */}
              <div className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-center gap-3">
                <Activity className="w-8 h-8 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Health Averages</span>
                  <p className="text-xs font-bold text-slate-100">
                    Checked ({Object.keys(currentRetro?.healthCheckScores || {}).length} Dimensions)
                  </p>
                </div>
              </div>

              {/* Daki Count */}
              <div className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-center gap-3">
                <LayoutGrid className="w-8 h-8 text-cyan-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Feedback Card Count</span>
                  <p className="text-xs font-bold text-slate-100">
                    {currentRetro?.dakiCards.length || 0} DAKI items processed
                  </p>
                </div>
              </div>

              {/* New Actions */}
              <div className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-center gap-3">
                <FileText className="w-8 h-8 text-indigo-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">New Commitments</span>
                  <p className="text-xs font-bold text-slate-100">
                    {currentRetro?.actionItems.length || 0} Action Items created
                  </p>
                </div>
              </div>
            </div>

            {currentRetro?.actionItems && currentRetro.actionItems.length > 0 && (
              <div className="mt-2 border-t border-white/5 pt-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Committed Actions:</h3>
                <div className="flex flex-col gap-2 max-h-[140px] overflow-y-auto pr-1">
                  {currentRetro.actionItems.map(item => (
                    <div key={item.id} className="text-xs text-slate-300 flex justify-between gap-4 py-1 border-b border-white/5 last:border-0">
                      <span className="truncate">• {item.description}</span>
                      <span className="font-semibold text-[10px] text-slate-400 shrink-0 font-mono">Due: {item.dueDate}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
