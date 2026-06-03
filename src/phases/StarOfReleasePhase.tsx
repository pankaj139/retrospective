import React, { useState, useMemo } from 'react';
import { useRetro } from '../context/RetroContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Trophy, ArrowLeft, ArrowRight, Star, Check } from 'lucide-react';
import { playClick, playPop } from '../utils/sound';

export const StarOfReleasePhase: React.FC = () => {
  const {
    currentRetro,
    teams,
    selectedTeamId,
    currentUserMemberId,
    setStarOfReleaseVote,
    nextPhase,
    prevPhase
  } = useRetro();

  const team = teams.find(t => t.id === selectedTeamId) || teams[0];
  const isFacilitator = !currentRetro?.createdBy || currentRetro.createdBy === currentUserMemberId;
  const votes = useMemo(
    () => currentRetro?.starOfReleaseVotes ?? {},
    [currentRetro?.starOfReleaseVotes]
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const myVote = votes[currentUserMemberId] || null;

  // Tally votes per nominee
  const voteTally = useMemo(() => {
    const tally: Record<string, number> = {};
    Object.values(votes).forEach(nomineeId => {
      tally[nomineeId] = (tally[nomineeId] || 0) + 1;
    });
    return tally;
  }, [votes]);

  const topVote = useMemo(() => {
    let maxVotes = 0;
    let winner = '';
    Object.entries(voteTally).forEach(([mId, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        winner = mId;
      }
    });
    return { winner, count: maxVotes };
  }, [voteTally]);

  const totalVoters = team.members.length;
  const totalVotesCast = Object.keys(votes).length;
  const allVoted = totalVotesCast >= totalVoters;

  const handleVote = async (nomineeId: string) => {
    if (!currentUserMemberId || nomineeId === currentUserMemberId) return;
    playPop(500);
    setIsSubmitting(true);
    try {
      await setStarOfReleaseVote(currentUserMemberId, nomineeId);
    } finally {
      setIsSubmitting(false);
    }
  };

  const winnerMember = team.members.find(m => m.id === topVote.winner);

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 animate-fade-in px-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h1 className="title-large flex items-center gap-3">
            <Trophy className="w-9 h-9 text-amber-400" />
            Star of the Release
          </h1>
          <p className="subtitle text-sm">
            Nominate the team member who shone brightest this release. One vote per person.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isFacilitator ? (
            <>
              <Button variant="outline" size="sm" onClick={() => { playClick(); prevPhase(); }} icon={<ArrowLeft className="w-4 h-4" />}>
                Back
              </Button>
              <Button
                variant="success"
                size="sm"
                onClick={() => { playClick(); nextPhase(); }}
                icon={<ArrowRight className="w-4 h-4" />}
                iconRight
                glow
              >
                Retro Score
              </Button>
            </>
          ) : (
            <span className="text-xs text-slate-400 italic bg-white/5 border border-white/5 px-3 py-1.5 rounded-lg">
              Waiting for facilitator...
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left – Voting area */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <Card padding="md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                Cast Your Nomination
              </h2>
              <span className="text-xs text-slate-500">
                {totalVotesCast}/{totalVoters} voted
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {team.members.map(member => {
                const isSelf = member.id === currentUserMemberId;
                const isNominated = myVote === member.id;
                const memberVoteCount = voteTally[member.id] || 0;

                return (
                  <button
                    key={member.id}
                    disabled={isSelf || isSubmitting}
                    onClick={() => handleVote(member.id)}
                    className={`relative flex items-center gap-3 p-4 rounded-xl border text-left transition-all duration-200
                      ${isSelf
                        ? 'opacity-40 cursor-not-allowed bg-white/3 border-white/5'
                        : isNominated
                          ? 'bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/20 cursor-pointer shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                          : 'bg-white/3 border-white/5 hover:bg-white/8 hover:border-indigo-500/30 cursor-pointer'
                      }
                    `}
                  >
                    <span className="text-3xl flex-shrink-0">{member.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-200 truncate flex items-center gap-1.5">
                        {member.name}
                        {isSelf && <span className="text-[9px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded font-normal">YOU</span>}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">{member.role}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {isNominated && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/20">
                          <Check className="w-3 h-3" /> Your pick
                        </span>
                      )}
                      {allVoted && memberVoteCount > 0 && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-indigo-400">
                          <Star className="w-3 h-3 fill-current" /> {memberVoteCount}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {!currentUserMemberId && (
              <p className="mt-4 text-xs text-rose-400 text-center">
                Please select your identity before voting.
              </p>
            )}
          </Card>
        </div>

        {/* Right – Live leaderboard */}
        <div className="flex flex-col gap-4">
          {/* Progress indicator */}
          <Card padding="md">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Voting Progress</h3>
            <div className="flex flex-col gap-2">
              {team.members.map(member => {
                const hasVoted = votes[member.id] !== undefined;
                return (
                  <div key={member.id} className="flex items-center gap-2 text-xs">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${hasVoted ? 'bg-emerald-400' : 'bg-slate-700'}`} />
                    <span className={hasVoted ? 'text-slate-300' : 'text-slate-600'}>{member.emoji} {member.name}</span>
                    {hasVoted && <Check className="w-3 h-3 text-emerald-400 ml-auto" />}
                  </div>
                );
              })}
            </div>

            <div className="mt-3 w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${totalVoters > 0 ? (totalVotesCast / totalVoters) * 100 : 0}%` }}
              />
            </div>
          </Card>

          {/* Winner reveal */}
          {allVoted && winnerMember ? (
            <Card padding="md" className="border-amber-500/20 bg-amber-950/10">
              <div className="flex flex-col items-center text-center gap-3 py-2">
                <div className="relative">
                  <span className="text-5xl">{winnerMember.emoji}</span>
                  <Trophy className="w-6 h-6 text-amber-400 absolute -top-1 -right-2 drop-shadow-[0_0_8px_rgba(245,158,11,0.9)] animate-pulse" />
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-1">⭐ Star of the Release</p>
                  <p className="text-lg font-extrabold text-slate-100">{winnerMember.name}</p>
                  <p className="text-xs text-slate-400">{winnerMember.role}</p>
                  <p className="text-xs text-amber-500/80 mt-1.5 font-semibold">
                    {topVote.count} / {totalVoters} nomination{topVote.count !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="text-xs text-slate-400 italic border-t border-white/5 pt-3 w-full">
                  🎉 Congratulations! The team has spoken.
                </div>
              </div>
            </Card>
          ) : totalVotesCast > 0 ? (
            <Card padding="md">
              <p className="text-xs text-slate-400 text-center">
                Waiting for all votes before revealing the winner...
              </p>
              <div className="flex justify-center mt-3 gap-1">
                {Array.from({ length: totalVoters - totalVotesCast }).map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-slate-700 animate-pulse" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
};
