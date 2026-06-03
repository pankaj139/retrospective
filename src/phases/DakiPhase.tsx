import React, { useState, useEffect } from 'react';
import { useRetro } from '../context/RetroContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { playClick, playPop, playClock, playBuzzer } from '../utils/sound';
import { 
  LayoutGrid, ArrowLeft, ArrowRight, ThumbsUp, Trash2, 
  Play, Pause, RotateCcw, Timer, PlusCircle
} from 'lucide-react';

type ColumnType = 'drop' | 'add' | 'keep' | 'improve';

export const DakiPhase: React.FC = () => {
  const { 
    currentRetro, 
    teams, 
    selectedTeamId, 
    addDakiCard, 
    voteDakiCard, 
    deleteDakiCard, 
    nextPhase, 
    prevPhase,
    currentUserMemberId
  } = useRetro();

  const team = teams.find(t => t.id === selectedTeamId) || teams[0];
  const isFacilitator = !currentRetro?.createdBy || currentRetro.createdBy === currentUserMemberId;

  // Card creator form state
  const [activeColumn, setActiveColumn] = useState<ColumnType>('add');
  const [cardText, setCardText] = useState('');
  const [cardCategory, setCardCategory] = useState('Process');

  // Countdown timer state
  const [timerSeconds, setTimerSeconds] = useState(180); // 3 minutes default
  const [timerRunning, setTimerRunning] = useState(false);

  const activeMember = team.members.find(m => m.id === currentUserMemberId) || team.members[0];

  // Countdown clock loop
  useEffect(() => {
    let interval: any;
    if (timerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            setTimerRunning(false);
            playBuzzer();
            return 0;
          }
          // Play a subtle clock tick during final 10 seconds
          if (prev <= 11) {
            playClock();
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning, timerSeconds]);

  const handleTimerToggle = () => {
    playClick();
    setTimerRunning(!timerRunning);
  };

  const handleTimerReset = () => {
    playClick();
    setTimerRunning(false);
    setTimerSeconds(180);
  };

  const handleAddCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardText.trim()) return;

    playPop(350);
    addDakiCard(activeColumn, cardText, activeMember?.id || 'unknown', cardCategory);
    setCardText('');
  };

  const handleUpvote = (cId: string) => {
    if (!currentUserMemberId) return;
    playPop(500 + Math.random() * 100);
    voteDakiCard(cId, currentUserMemberId);
  };

  const handleDelete = (cId: string) => {
    playClick();
    deleteDakiCard(cId);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCardsByColumn = (col: ColumnType) => {
    return currentRetro?.dakiCards.filter(c => c.column === col) || [];
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

  return (
    <div className="w-full max-w-[1280px] mx-auto flex flex-col gap-6 animate-fade-in px-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h1 className="title-large flex items-center gap-3">
            <LayoutGrid className="w-9 h-9 text-indigo-400" />
            DAKI Retro Board
          </h1>
          <p className="subtitle text-sm">Categorize feedback to Drop, Add, Keep, or Improve our sprint practices.</p>
        </div>

        {/* Timer controls and navigation */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Visual Clock */}
          <div className="flex items-center gap-2.5 bg-slate-950/60 border border-white/10 px-4 py-2 rounded-xl">
            <Timer className={`w-4 h-4 ${timerSeconds <= 10 && timerSeconds > 0 ? 'text-rose-500 animate-bounce' : 'text-slate-400'}`} />
            <span className={`font-mono text-sm font-bold ${timerSeconds <= 10 && timerSeconds > 0 ? 'text-rose-500 font-extrabold animate-pulse' : 'text-slate-200'}`}>
              {formatTime(timerSeconds)}
            </span>
            <button onClick={handleTimerToggle} className="text-slate-400 hover:text-white p-0.5 transition-colors">
              {timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            </button>
            <button onClick={handleTimerReset} className="text-slate-400 hover:text-white p-0.5 transition-colors">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

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
                Prioritize
              </Button>
            </>
          ) : (
            <span className="text-xs text-slate-400 italic bg-white/5 border border-white/5 px-3 py-1.5 rounded-lg">
              Waiting for facilitator...
            </span>
          )}
        </div>
      </div>

      {/* Main card adder form */}
      <Card padding="md" className="max-w-5xl mx-auto w-full">
        <form onSubmit={handleAddCardSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Category Box</label>
            <select
              value={activeColumn}
              onChange={e => { playClick(); setActiveColumn(e.target.value as ColumnType); }}
              className="form-select font-semibold"
            >
              <option value="drop">🛑 DROP (Stop Doing)</option>
              <option value="add">➕ ADD (Start Doing)</option>
              <option value="keep">⭐ KEEP (Good Things)</option>
              <option value="improve">⚙️ IMPROVE (Better Ways)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Feedback Content</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Share your feedback, ideas, or grievances..."
                value={cardText}
                onChange={e => setCardText(e.target.value)}
                required
                className="form-input pr-10"
              />
              <button 
                type="submit" 
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <PlusCircle className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5 justify-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Posting As</span>
              <span className="text-xs font-semibold py-2.5 px-3 bg-white/5 border border-white/5 rounded-xl block truncate">
                {activeMember?.emoji} {activeMember?.name}
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Tag</label>
              <select
                value={cardCategory}
                onChange={e => setCardCategory(e.target.value)}
                className="form-select text-xs py-2"
              >
                <option value="Code">💻 Code</option>
                <option value="Testing">🕵️‍♀️ Testing</option>
                <option value="Process">⚙️ Process</option>
                <option value="Documentation">📚 Docs</option>
                <option value="Product">💼 Product</option>
                <option value="General">🏷️ General</option>
              </select>
            </div>
          </div>
        </form>
      </Card>

      {/* 4 DAKI Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        {/* DROP Column */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-rose-500/20 pb-2 px-1">
            <h2 className="text-sm font-bold text-rose-400 flex items-center gap-1.5 uppercase tracking-wide">
              🛑 DROP
            </h2>
            <span className="text-xs bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full font-mono font-bold">
              {getCardsByColumn('drop').length}
            </span>
          </div>
          
          <div className="daki-column border-rose-500/5 bg-rose-950/5 min-h-[450px]">
            {getCardsByColumn('drop').map(card => (
              <DakiCardComponent key={card.id} card={card} currentUserMemberId={currentUserMemberId} onUpvote={handleUpvote} onDelete={handleDelete} getBadge={getCategoryBadgeClass} />
            ))}
          </div>
        </div>

        {/* ADD Column */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2 px-1">
            <h2 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wide">
              ➕ ADD
            </h2>
            <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono font-bold">
              {getCardsByColumn('add').length}
            </span>
          </div>

          <div className="daki-column border-emerald-500/5 bg-emerald-950/5 min-h-[450px]">
            {getCardsByColumn('add').map(card => (
              <DakiCardComponent key={card.id} card={card} currentUserMemberId={currentUserMemberId} onUpvote={handleUpvote} onDelete={handleDelete} getBadge={getCategoryBadgeClass} />
            ))}
          </div>
        </div>

        {/* KEEP Column */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-amber-500/20 pb-2 px-1">
            <h2 className="text-sm font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wide">
              ⭐ KEEP
            </h2>
            <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-mono font-bold">
              {getCardsByColumn('keep').length}
            </span>
          </div>

          <div className="daki-column border-amber-500/5 bg-amber-950/5 min-h-[450px]">
            {getCardsByColumn('keep').map(card => (
              <DakiCardComponent key={card.id} card={card} currentUserMemberId={currentUserMemberId} onUpvote={handleUpvote} onDelete={handleDelete} getBadge={getCategoryBadgeClass} />
            ))}
          </div>
        </div>

        {/* IMPROVE Column */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2 px-1">
            <h2 className="text-sm font-bold text-cyan-400 flex items-center gap-1.5 uppercase tracking-wide">
              ⚙️ IMPROVE
            </h2>
            <span className="text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full font-mono font-bold">
              {getCardsByColumn('improve').length}
            </span>
          </div>

          <div className="daki-column border-cyan-500/5 bg-cyan-950/5 min-h-[450px]">
            {getCardsByColumn('improve').map(card => (
              <DakiCardComponent key={card.id} card={card} currentUserMemberId={currentUserMemberId} onUpvote={handleUpvote} onDelete={handleDelete} getBadge={getCategoryBadgeClass} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Sub-component for individual DAKI card
interface DakiCardComponentProps {
  card: any;
  currentUserMemberId: string;
  onUpvote: (id: string) => void;
  onDelete: (id: string) => void;
  getBadge: (cat: string) => string;
}

const DakiCardComponent: React.FC<DakiCardComponentProps> = ({ card, currentUserMemberId, onUpvote, onDelete, getBadge }) => {
  const isOwnCard = card.authorId === currentUserMemberId;
  const hasVoted = card.votedBy?.includes(currentUserMemberId);

  return (
    <div className="daki-card-item flex flex-col justify-between h-auto gap-3 animate-fade-in">
      <div className="flex-1">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className={`badge text-[8px] font-semibold border ${getBadge(card.category || '')}`}>
            {card.category}
          </span>
        </div>
        <p className="text-xs text-slate-200 leading-relaxed font-medium">
          {card.content}
        </p>
      </div>

      <div className="flex items-center justify-between border-t border-white/5 pt-2 mt-1">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 min-w-0">
          <span className="text-sm shrink-0">{card.authorEmoji}</span>
          <span className="truncate font-semibold text-slate-300">{card.authorName}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => !isOwnCard && onUpvote(card.id)}
            disabled={isOwnCard}
            className={`flex items-center gap-1 text-[10px] bg-slate-900 border px-2 py-1 rounded-lg transition-colors
              ${isOwnCard 
                ? 'opacity-40 cursor-not-allowed border-white/5 text-slate-500' 
                : hasVoted 
                  ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' 
                  : 'border-white/5 hover:border-indigo-500/30 text-slate-400 hover:text-indigo-400'
              }
            `}
            title={isOwnCard ? "You cannot vote on your own feedback" : ""}
          >
            <ThumbsUp className={`w-3 h-3 ${hasVoted ? 'fill-current' : ''}`} />
            <span className="font-bold font-mono">{card.votes}</span>
          </button>
          
          <button
            onClick={() => onDelete(card.id)}
            className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
