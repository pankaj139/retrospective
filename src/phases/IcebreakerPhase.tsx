import React, { useState, useEffect } from 'react';
import { useRetro } from '../context/RetroContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { ICEBREAKER_QUESTIONS } from '../utils/mockData';
import { Sparkles, MessageSquare, ArrowLeft, ArrowRight, RefreshCw } from 'lucide-react';
import { playClick, playSuccess } from '../utils/sound';

export const IcebreakerPhase: React.FC = () => {
  const { 
    currentRetro, 
    teams, 
    selectedTeamId, 
    setIcebreakerAnswer, 
    setIcebreakerQuestion,
    nextPhase, 
    prevPhase,
    currentUserMemberId 
  } = useRetro();
  
  const team = teams.find(t => t.id === selectedTeamId) || teams[0];
  const myMember = team?.members.find(m => m.id === currentUserMemberId);
  const isFacilitator = !currentRetro?.createdBy || currentRetro.createdBy === currentUserMemberId;

  const [currentText, setCurrentText] = useState('');

  // Synchronize local input state with database value for current user
  useEffect(() => {
    if (currentUserMemberId && currentRetro) {
      setCurrentText(currentRetro.icebreakerAnswers[currentUserMemberId] || '');
    }
  }, [currentUserMemberId, currentRetro?.icebreakerAnswers]);

  const handleNextQuestion = () => {
    playClick();
    const currentQ = currentRetro?.icebreakerQuestion || '';
    let nextQ = currentQ;
    // Ensure we don't pick the same question twice
    while (nextQ === currentQ) {
      nextQ = ICEBREAKER_QUESTIONS[Math.floor(Math.random() * ICEBREAKER_QUESTIONS.length)];
    }
    setIcebreakerQuestion(nextQ);
    setCurrentText('');
  };

  const handleSaveAnswer = () => {
    if (!currentUserMemberId) return;

    playClick();
    setIcebreakerAnswer(currentUserMemberId, currentText);
    playSuccess();
  };

  const question = currentRetro?.icebreakerQuestion || 'What is your favorite coding snack or drink?';
  const allAnswered = team.members.length > 0 && team.members.every(m => currentRetro?.icebreakerAnswers[m.id]);

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h1 className="title-large flex items-center gap-3">
            <Sparkles className="w-9 h-9 text-indigo-400" />
            Icebreaker
          </h1>
          <p className="subtitle">Let's get to know each other and spark a conversation!</p>
        </div>

        <div className="flex items-center gap-3">
          {isFacilitator ? (
            <>
              <Button variant="outline" size="sm" onClick={prevPhase} icon={<ArrowLeft className="w-4 h-4" />}>
                Back
              </Button>
              <Button variant="primary" size="sm" onClick={handleNextQuestion} icon={<RefreshCw className="w-4 h-4" />}>
                New Question
              </Button>
              <Button
                variant="success"
                size="sm"
                onClick={nextPhase}
                icon={<ArrowRight className="w-4 h-4" />}
                iconRight
                glow
              >
                Previous Actions
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
        {/* Icebreaker Card */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card variant="brand" padding="lg" className="text-center flex flex-col justify-center items-center py-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl" />
            
            <span className="text-xs font-semibold text-indigo-400 tracking-widest uppercase mb-3 bg-indigo-500/10 px-3 py-1 rounded-full">
              Today's Spark Question
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold max-w-xl leading-snug px-4 mb-4">
              "{question}"
            </h2>
          </Card>

          {/* Form to submit answer */}
          {myMember ? (
            <Card padding="lg" className="flex flex-col gap-4">
              <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                <span className="text-3xl">{myMember.emoji}</span>
                <div>
                  <h3 className="text-lg font-bold">Answering as {myMember.name}</h3>
                  <p className="text-xs text-indigo-400">{myMember.role}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Your Response
                </label>
                <textarea
                  value={currentText}
                  onChange={e => setCurrentText(e.target.value)}
                  placeholder="Type your answer here..."
                  rows={3}
                  className="form-input text-base leading-relaxed py-3"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSaveAnswer();
                    }
                  }}
                />
              </div>

              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-slate-500">
                  Tip: Press Enter or click Save to submit your answer.
                </span>
                <Button variant="primary" onClick={handleSaveAnswer}>
                  Save Answer
                </Button>
              </div>
            </Card>
          ) : (
            <Card padding="lg" className="flex flex-col gap-4 text-center py-8">
              <p className="text-sm text-amber-400 font-semibold">
                ⚠️ You must select your identity in the setup phase to participate in the icebreaker.
              </p>
            </Card>
          )}
        </div>

        {/* Members responses checklist */}
        <Card padding="lg" className="flex flex-col h-full">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-4 border-b border-white/5 pb-3">
            <MessageSquare className="w-5 h-5 text-indigo-400" />
            Team Answers
          </h2>

          <div className="flex-grow flex flex-col gap-3 overflow-y-auto max-h-[360px] pr-1">
            {team.members.map((member) => {
              const answer = currentRetro?.icebreakerAnswers[member.id];
              const isMe = member.id === currentUserMemberId;
              
              return (
                <div
                  key={member.id}
                  className={`p-3 rounded-xl border transition-all duration-200 w-full flex flex-col gap-1.5
                    ${isMe 
                      ? 'bg-indigo-600/10 border-indigo-500/30 ring-1 ring-indigo-500/20' 
                      : answer 
                        ? 'bg-white/5 border-emerald-500/20' 
                        : 'bg-slate-900/40 border-white/5'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base">{member.emoji}</span>
                      <span className="text-xs font-semibold truncate text-slate-200">
                        {member.name}
                        {isMe && (
                          <span className="ml-1.5 text-[8px] bg-indigo-500 text-white font-normal px-1 rounded">
                            YOU
                          </span>
                        )}
                      </span>
                    </div>
                    {answer ? (
                      <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded font-medium">
                        Answered
                      </span>
                    ) : (
                      <span className="text-[10px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">
                        Pending
                      </span>
                    )}
                  </div>
                  
                  {answer && (
                    <p className="text-xs text-slate-300 italic line-clamp-2 pl-6 mt-0.5">
                      {allAnswered || isMe 
                        ? `"${answer}"` 
                        : "🔒 Answer hidden until everyone submits"
                      }
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {allAnswered ? (
            <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-xs text-emerald-400 text-center font-medium animate-pulse">
              🎉 Everyone answered! Ready to review.
            </div>
          ) : (
            <div className="mt-4 p-3 bg-slate-950/40 border border-white/5 rounded-xl text-xs text-slate-400 text-center italic">
              Answers are locked until everyone submits their response.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
