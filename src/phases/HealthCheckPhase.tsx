import React, { useState, useEffect } from 'react';
import { useRetro } from '../context/RetroContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { HEALTH_METRICS } from '../utils/mockData';
import { playClick, playSuccess } from '../utils/sound';
import { Activity, ArrowLeft, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';

export const HealthCheckPhase: React.FC = () => {
  const { 
    currentRetro, 
    setHealthScore, 
    nextPhase, 
    prevPhase,
    currentUserMemberId,
    teams,
    selectedTeamId
  } = useRetro();

  const team = teams.find(t => t.id === selectedTeamId) || teams[0];
  const isFacilitator = !currentRetro?.createdBy || currentRetro.createdBy === currentUserMemberId;

  const [ratings, setRatings] = useState<Record<string, number>>({});
  // reevaluating overrides submitted so user can edit again without clearing DB data
  const [reevaluating, setReevaluating] = useState(false);

  // Derive submitted directly from DB — survives page refresh without any flash
  const myDbScores = currentRetro?.healthCheckScores[currentUserMemberId || ''] || {};
  const isDbSubmitted = Object.keys(myDbScores).length > 0;
  const submitted = isDbSubmitted && !reevaluating;

  // Sync range sliders with current user's database values (only affects slider display, not submitted state)
  useEffect(() => {
    if (currentRetro && currentUserMemberId) {
      const myScores = currentRetro.healthCheckScores[currentUserMemberId] || {};
      // Only update ratings from DB when not actively editing
      if (!reevaluating) {
        const initial: Record<string, number> = {};
        HEALTH_METRICS.forEach(metric => {
          initial[metric.id] = myScores[metric.id] !== undefined ? myScores[metric.id] : 3;
        });
        setRatings(initial);
      }
    }
  }, [currentRetro?.healthCheckScores, currentUserMemberId]);

  const handleSliderChange = (metricId: string, val: number) => {
    setRatings(prev => ({ ...prev, [metricId]: val }));
  };

  const handleSubmit = () => {
    if (!currentUserMemberId) return;
    playClick();
    Object.entries(ratings).forEach(([metricId, val]) => {
      setHealthScore(currentUserMemberId, metricId, val);
    });
    setReevaluating(false); // submitted is now derived from DB, so just exit reevaluating mode
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
  const getAverageScore = (metricId: string) => {
    if (!currentRetro) return 3;
    const scores: number[] = [];
    Object.values(currentRetro.healthCheckScores).forEach(mScores => {
      if (mScores[metricId] !== undefined) {
        scores.push(mScores[metricId]);
      }
    });
    return scores.length > 0 
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 
      : 3;
  };

  // Derive submission checklist stats
  const submittedMemberIds = new Set(
    Object.keys(currentRetro?.healthCheckScores || {}).filter(mId => {
      const scores = currentRetro?.healthCheckScores[mId];
      return scores && Object.keys(scores).length > 0;
    })
  );
  const joinedMembers = team?.members.filter(m =>
    m.id === currentUserMemberId ||
    currentRetro?.gameScores[m.id] !== undefined ||
    currentRetro?.healthCheckScores[m.id] !== undefined
  ) || [];
  const totalMembers = joinedMembers.length;
  const submittedCount = joinedMembers.filter(m => submittedMemberIds.has(m.id)).length;
  const allSubmitted = totalMembers > 0 && joinedMembers.every(m => submittedMemberIds.has(m.id));

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h1 className="title-large flex items-center gap-3">
            <Activity className="w-9 h-9 text-indigo-400" />
            Health Check
          </h1>
          <p className="subtitle">Let's gauge our speed, code quality, morale, collaboration, and processes.</p>
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
                Submit My Score
              </Button>
            </>
          )}
          {isDbSubmitted && !allSubmitted && (
            <Button variant="outline" size="sm" onClick={() => { playClick(); setReevaluating(true); }} icon={<Activity className="w-4 h-4" />}>
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
              AI Adoption
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
            <h2 className="text-lg font-bold border-b border-white/5 pb-3">
              {allSubmitted 
                ? 'Team Health Averages' 
                : submitted 
                  ? 'Evaluation Submitted (Waiting for teammates)' 
                  : 'Drag to Rate Your Scores'
              }
            </h2>
            
            <div className="flex flex-col gap-6">
              {HEALTH_METRICS.map(metric => {
                const val = allSubmitted ? getAverageScore(metric.id) : (ratings[metric.id] || 3);
                return (
                  <div key={metric.id} className="flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-100">{metric.name}</h3>
                        <p className="text-xs text-slate-400">{metric.description}</p>
                      </div>
                      <span className={`text-base font-bold font-mono px-2 py-0.5 rounded bg-white/5 border border-white/5 flex items-center gap-1.5 ${getRatingColor(val)}`}>
                        {getEmojiForRating(val)} {val}
                      </span>
                    </div>

                    {!submitted && !allSubmitted ? (
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-[10px] text-slate-500 font-medium w-24 text-left truncate">{metric.lowLabel}</span>
                        <input
                          type="range"
                          min="1"
                          max="5"
                          step="0.5"
                          value={val}
                          onChange={e => handleSliderChange(metric.id, parseFloat(e.target.value))}
                          className="custom-range flex-1"
                        />
                        <span className="text-[10px] text-slate-500 font-medium w-24 text-right truncate">{metric.highLabel}</span>
                      </div>
                    ) : (
                      // Progress bar display when submitted or all submitted
                      <div className="w-full h-2.5 bg-slate-950/60 rounded-full overflow-hidden border border-white/5 relative mt-1">
                        <div 
                          className={`h-full rounded-full transition-all duration-500
                            ${val < 2.5 
                              ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]' 
                              : val < 3.5 
                                ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]' 
                                : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                            }
                          `}
                          style={{ width: `${(val / 5) * 100}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Visual Charts (SVG Radar / Bar representation) */}
        <Card padding="lg" className="lg:col-span-2 flex flex-col items-center justify-center min-h-[350px]">
          <h2 className="text-lg font-bold w-full text-left mb-6 border-b border-white/5 pb-3 font-outfit">
            Health Check Radar
          </h2>

          {!allSubmitted ? (
            <div className="w-full flex flex-col items-center justify-center gap-6 py-6 animate-fade-in">
              <div className="flex flex-col items-center justify-center text-center gap-3 py-4 text-slate-500 max-w-xs">
                <ShieldAlert className="w-12 h-12 text-indigo-400 opacity-80 animate-pulse" />
                <p className="text-sm font-semibold text-slate-200">🔒 Results Locked</p>
                <p className="text-xs leading-relaxed text-slate-400">
                  The health radar map will be revealed once all team members have submitted their ratings.
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
                      points={HEALTH_METRICS.map((_, i) => {
                        const angle = (i * 2 * Math.PI) / HEALTH_METRICS.length - Math.PI / 2;
                        const r = 80 * scale;
                        return `${100 + r * Math.cos(angle)},${100 + r * Math.sin(angle)}`;
                      }).join(' ')}
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.05)"
                      strokeWidth="1"
                    />
                  ))}
                  
                  {/* Grid Lines radiating from center */}
                  {HEALTH_METRICS.map((_, i) => {
                    const angle = (i * 2 * Math.PI) / HEALTH_METRICS.length - Math.PI / 2;
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
                    points={HEALTH_METRICS.map((metric, i) => {
                      const angle = (i * 2 * Math.PI) / HEALTH_METRICS.length - Math.PI / 2;
                      const score = getAverageScore(metric.id);
                      const r = 80 * (score / 5);
                      return `${100 + r * Math.cos(angle)},${100 + r * Math.sin(angle)}`;
                    }).join(' ')}
                    fill="rgba(99, 102, 241, 0.2)"
                    stroke="var(--color-brand)"
                    strokeWidth="2.5"
                    className="drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                  />

                  {/* Vertices/Data points */}
                  {HEALTH_METRICS.map((metric, i) => {
                    const angle = (i * 2 * Math.PI) / HEALTH_METRICS.length - Math.PI / 2;
                    const score = getAverageScore(metric.id);
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

                  {/* Metric Labels on axis tips */}
                  {HEALTH_METRICS.map((metric, i) => {
                    const angle = (i * 2 * Math.PI) / HEALTH_METRICS.length - Math.PI / 2;
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
                        {metric.name.split(' ')[0]}
                      </text>
                    );
                  })}
                </svg>
              </div>

              <div className="text-center text-xs text-slate-400 max-w-xs leading-relaxed mt-2">
                This radar map displays your team's structural performance. A wider, more balanced polygon indicates higher health across all sprint parameters.
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
