import React, { useMemo, useState } from 'react';
import { useRetro } from '../context/RetroContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { AI_ADOPTION_QUESTIONS } from '../utils/mockData';
import { playClick, playSuccess } from '../utils/sound';
import { BrainCircuit, ArrowLeft, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';

export const AiAdoptionPhase: React.FC = () => {
  const { 
    currentRetro, 
    setAiAdoptionScore, 
    nextPhase, 
    prevPhase,
    currentUserMemberId,
    teams,
    selectedTeamId
  } = useRetro();

  const team = teams.find(t => t.id === selectedTeamId) || teams[0];
  const isFacilitator = !currentRetro?.createdBy || currentRetro.createdBy === currentUserMemberId;

  const [draftRatings, setDraftRatings] = useState<Record<string, number> | null>(null);
  // reevaluating overrides submitted so user can edit again without clearing DB data
  const [reevaluating, setReevaluating] = useState(false);

  // Derive submitted directly from DB — survives page refresh without any flash
  const myDbScores = currentRetro?.aiAdoptionScores?.[currentUserMemberId || ''] || {};
  const isDbSubmitted = Object.keys(myDbScores).length > 0;
  const submitted = isDbSubmitted && !reevaluating;

  const dbRatings = useMemo(() => {
    const myScores = currentRetro?.aiAdoptionScores?.[currentUserMemberId || ''] || {};
    const initial: Record<string, number> = {};
    AI_ADOPTION_QUESTIONS.forEach(question => {
      initial[question.id] = myScores[question.id] !== undefined ? myScores[question.id] : 3;
    });
    return initial;
  }, [currentRetro?.aiAdoptionScores, currentUserMemberId]);

  const ratings = reevaluating ? (draftRatings || dbRatings) : dbRatings;

  const handleSliderChange = (questionId: string, val: number) => {
    setDraftRatings(prev => ({ ...(prev || dbRatings), [questionId]: val }));
  };

  const handleSubmit = () => {
    if (!currentUserMemberId) return;
    playClick();
    Object.entries(ratings).forEach(([questionId, val]) => {
      setAiAdoptionScore(currentUserMemberId, questionId, val);
    });
    setReevaluating(false); // submitted is now derived from DB, so just exit reevaluating mode
    setDraftRatings(null);
    playSuccess();
  };

  const getEmojiForRating = (rating: number) => {
    if (rating < 2) return '😭';
    if (rating < 3) return '😕';
    if (rating < 4) return '😐';
    if (rating < 4.8) return '🙂';
    return '🤩';
  };

  const getRatingColor = (rating: number) => {
    if (rating < 2.5) return 'text-rose-500';
    if (rating < 3.5) return 'text-amber-500';
    return 'text-emerald-500';
  };

  // Compute average score for each metric across all submitted scores
  const getAverageScore = (questionId: string) => {
    if (!currentRetro) return 3;
    const scores: number[] = [];
    Object.values(currentRetro.aiAdoptionScores || {}).forEach(mScores => {
      if (mScores[questionId] !== undefined) {
        scores.push(mScores[questionId]);
      }
    });
    return scores.length > 0 
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 
      : 3;
  };

  // Derive submission checklist stats
  const submittedMemberIds = new Set(
    Object.keys(currentRetro?.aiAdoptionScores || {}).filter(mId => {
      const scores = currentRetro?.aiAdoptionScores[mId];
      return scores && Object.keys(scores).length > 0;
    })
  );
  const joinedMembers = team?.members.filter(m =>
    m.id === currentUserMemberId ||
    currentRetro?.gameScores[m.id] !== undefined ||
    currentRetro?.aiAdoptionScores?.[m.id] !== undefined
  ) || [];
  const totalMembers = joinedMembers.length;
  const submittedCount = joinedMembers.filter(m => submittedMemberIds.has(m.id)).length;
  const allSubmitted = totalMembers > 0 && joinedMembers.every(m => submittedMemberIds.has(m.id));

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h1 className="title-large flex items-center gap-3">
            <BrainCircuit className="w-9 h-9 text-indigo-400" />
            AI Adoption
          </h1>
          <p className="subtitle">Let's check in on our AI adoption frequency, prompting comfort, andforce-multiplier value.</p>
        </div>

        <div className="flex items-center gap-3">
          {isFacilitator && (
            <Button variant="outline" size="sm" onClick={prevPhase} icon={<ArrowLeft className="w-4 h-4" />}>
              Back
            </Button>
          )}
          {!submitted && !allSubmitted && (
            <>
              <Button variant="primary" size="sm" onClick={handleSubmit} icon={<CheckCircle2 className="w-4 h-4" />}>
                Submit My Ratings
              </Button>
            </>
          )}
          {isDbSubmitted && !allSubmitted && (
            <Button variant="outline" size="sm" onClick={() => { playClick(); setDraftRatings(dbRatings); setReevaluating(true); }} icon={<BrainCircuit className="w-4 h-4" />}>
              Re-evaluate
            </Button>
          )}
          {isFacilitator ? (
            <Button
              disabled={!allSubmitted}
              variant="success"
              size="sm"
              onClick={nextPhase}
              icon={<ArrowRight className="w-4 h-4" />}
              iconRight
              glow
            >
              DAKI Board
            </Button>
          ) : (
            <span className="text-xs text-slate-400 italic bg-white/5 border border-white/5 px-3 py-1.5 rounded-lg">
              Waiting for facilitator...
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Sliders list */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <Card padding="lg" className="flex flex-col gap-6">
            <div className="flex flex-col border-b border-white/5 pb-2">
              <h2 className="text-base font-bold font-outfit text-slate-200">
                {submitted ? 'My Submitted Scores' : 'Rate AI adoption parameters'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {submitted ? 'Your scores are saved. Averages will reveal once the entire team submits.' : 'Drag the sliders below to capture your sentiment (1-5).'}
              </p>
            </div>

            <div className="flex flex-col gap-8 py-2">
              {AI_ADOPTION_QUESTIONS.map(question => {
                const currentVal = ratings[question.id] || 3;
                return (
                  <div key={question.id} className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-slate-300 tracking-wide font-outfit">
                          {question.name}
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                          {question.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 pl-4">
                        <span className="text-lg leading-none">{getEmojiForRating(currentVal)}</span>
                        <span className={`text-sm font-bold font-mono min-w-[24px] text-right ${getRatingColor(currentVal)}`}>
                          {currentVal}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <input
                        type="range"
                        min="1"
                        max="5"
                        step="0.5"
                        disabled={submitted}
                        value={currentVal}
                        onChange={e => handleSliderChange(question.id, parseFloat(e.target.value))}
                        className="w-full accent-indigo-500 h-1.5 rounded-lg bg-slate-900 appearance-none cursor-pointer border border-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
                      />
                      <div className="flex justify-between text-[8px] text-slate-500 font-bold uppercase tracking-wide px-0.5">
                        <span>{question.lowLabel}</span>
                        <span>{question.highLabel}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Visual Charts (SVG Radar / Bar representation) */}
        <Card padding="lg" className="lg:col-span-2 flex flex-col items-center justify-center min-h-[350px]">
          <h2 className="text-lg font-bold w-full text-left mb-6 border-b border-white/5 pb-3 font-outfit">
            AI Adoption Radar
          </h2>

          {!allSubmitted ? (
            <div className="w-full flex flex-col items-center justify-center gap-6 py-6 animate-fade-in">
              <div className="flex flex-col items-center justify-center text-center gap-3 py-4 text-slate-500 max-w-xs">
                <ShieldAlert className="w-12 h-12 text-indigo-400 opacity-80 animate-pulse" />
                <p className="text-sm font-semibold text-slate-200">🔒 Results Locked</p>
                <p className="text-xs leading-relaxed text-slate-400">
                  The AI adoption radar map will be revealed once all team members have submitted their ratings.
                </p>
              </div>
              
              <div className="w-full flex flex-col gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                {joinedMembers.map(member => {
                  const hasSubmitted = submittedMemberIds.has(member.id);
                  const isMe = member.id === currentUserMemberId;
                  return (
                    <div key={member.id} className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-base">{member.emoji}</span>
                        <span className="text-xs font-semibold text-slate-300 truncate">
                          {member.name} 
                          {isMe && <span className="text-[8px] bg-indigo-500 text-white font-normal px-1 rounded ml-1.5">YOU</span>}
                        </span>
                      </div>
                      {hasSubmitted ? (
                        <span className="text-[9px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded font-medium">
                          Submitted
                        </span>
                      ) : (
                        <span className="text-[9px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">
                          Pending
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              
              <span className="text-[11px] text-slate-500 italic mt-1 font-medium">
                {submittedCount} / {totalMembers} team members completed
              </span>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center gap-6 animate-fade-in">
              {/* Custom SVG Polygon Radar Chart */}
              <div className="relative w-64 h-64 flex items-center justify-center">
                <svg viewBox="0 0 200 200" className="w-full h-full">
                  {/* Grid Concentric Rings */}
                  {[0.2, 0.4, 0.6, 0.8, 1.0].map((scale, idx) => (
                    <polygon
                      key={idx}
                      points={AI_ADOPTION_QUESTIONS.map((_, i) => {
                        const angle = (i * 2 * Math.PI) / AI_ADOPTION_QUESTIONS.length - Math.PI / 2;
                        const r = 80 * scale;
                        return `${100 + r * Math.cos(angle)},${100 + r * Math.sin(angle)}`;
                      }).join(' ')}
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.05)"
                      strokeWidth="1"
                    />
                  ))}
                  
                  {/* Grid Lines radiating from center */}
                  {AI_ADOPTION_QUESTIONS.map((_, i) => {
                    const angle = (i * 2 * Math.PI) / AI_ADOPTION_QUESTIONS.length - Math.PI / 2;
                    return (
                      <line
                        key={i}
                        x1="100"
                        y1="100"
                        x2={100 + 80 * Math.cos(angle)}
                        y2={100 + 80 * Math.sin(angle)}
                        stroke="rgba(255, 255, 255, 0.05)"
                        strokeWidth="1"
                      />
                    );
                  })}

                  {/* Polygon matching scores */}
                  <polygon
                    points={AI_ADOPTION_QUESTIONS.map((question, i) => {
                      const angle = (i * 2 * Math.PI) / AI_ADOPTION_QUESTIONS.length - Math.PI / 2;
                      const score = getAverageScore(question.id);
                      const r = 80 * (score / 5);
                      return `${100 + r * Math.cos(angle)},${100 + r * Math.sin(angle)}`;
                    }).join(' ')}
                    fill="rgba(99, 102, 241, 0.2)"
                    stroke="var(--color-brand)"
                    strokeWidth="2.5"
                    className="drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                  />

                  {/* Vertices/Data points */}
                  {AI_ADOPTION_QUESTIONS.map((question, i) => {
                    const angle = (i * 2 * Math.PI) / AI_ADOPTION_QUESTIONS.length - Math.PI / 2;
                    const score = getAverageScore(question.id);
                    const r = 80 * (score / 5);
                    const cx = 100 + r * Math.cos(angle);
                    const cy = 100 + r * Math.sin(angle);
                    return (
                      <circle
                        key={i}
                        cx={cx}
                        cy={cy}
                        r="4"
                        fill="#fff"
                        stroke="var(--color-brand)"
                        strokeWidth="2.5"
                      />
                    );
                  })}

                  {/* Question Labels on axis tips */}
                  {AI_ADOPTION_QUESTIONS.map((question, i) => {
                    const angle = (i * 2 * Math.PI) / AI_ADOPTION_QUESTIONS.length - Math.PI / 2;
                    const lx = 100 + 94 * Math.cos(angle);
                    const ly = 100 + 94 * Math.sin(angle);
                    const anchor = Math.abs(Math.cos(angle)) < 0.1 ? 'middle' : Math.cos(angle) > 0 ? 'start' : 'end';
                    return (
                      <text
                        key={i}
                        x={lx}
                        y={ly + 4}
                        textAnchor={anchor}
                        fill="#9ca3af"
                        fontSize="9px"
                        fontWeight="semibold"
                        fontFamily="Outfit, sans-serif"
                      >
                        {question.name.split(' ').slice(1).join(' ') || question.name.split(' ')[0]}
                      </text>
                    );
                  })}
                </svg>
              </div>

              <div className="w-full flex flex-col gap-3.5 border-t border-white/5 pt-4">
                <h3 className="text-xs font-bold text-slate-300 tracking-wide font-outfit uppercase">
                  Metric averages
                </h3>
                <div className="flex flex-col gap-2">
                  {AI_ADOPTION_QUESTIONS.map(question => {
                    const val = getAverageScore(question.id);
                    return (
                      <div key={question.id} className="flex flex-col gap-1 bg-white/2 rounded-xl p-2 border border-white/5">
                        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400">
                          <span>{question.name}</span>
                          <span className={`${getRatingColor(val)} font-mono font-bold`}>{val} / 5.0</span>
                        </div>
                        <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500
                              ${val < 2.5 ? 'bg-rose-500' : val < 3.5 ? 'bg-amber-500' : 'bg-emerald-500'}
                            `}
                            style={{ width: `${(val / 5) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="text-center text-xs text-slate-400 max-w-xs leading-relaxed mt-2">
                This radar map plots team-wide AI comfort, utility, and confidence parameters.
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
