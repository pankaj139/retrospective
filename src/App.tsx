import React, { useState, useEffect } from 'react';
import { RetroProvider, useRetro } from './context/RetroContext';
import { Stepper } from './components/Stepper';
import { SetupPhase } from './phases/SetupPhase';
import { GamePhase } from './phases/GamePhase';
import { IcebreakerPhase } from './phases/IcebreakerPhase';
import { PrevActionsPhase } from './phases/PrevActionsPhase';
import { HealthCheckPhase } from './phases/HealthCheckPhase';
import { AiAdoptionPhase } from './phases/AiAdoptionPhase';
import { DakiPhase } from './phases/DakiPhase';
import { PrioritizePhase } from './phases/PrioritizePhase';
import { ScorePhase } from './phases/ScorePhase';
import { playClick } from './utils/sound';
import { LayoutGrid, XOctagon, LogOut } from 'lucide-react';
import './App.css';

const AppContent: React.FC = () => {
  const { currentRetro, setPhase, teams, selectedTeamId, cancelRetro, leaveRetro, hasJoined, currentUserMemberId } = useRetro();
  const team = teams.find(t => t.id === selectedTeamId) || teams[0];
  const isFacilitator = !currentRetro?.createdBy || currentRetro.createdBy === currentUserMemberId;

  // Track max phase visited during active session to unlock stepper steps
  const [maxPhaseVisited, setMaxPhaseVisited] = useState(1);

  useEffect(() => {
    if (currentRetro && hasJoined) {
      setMaxPhaseVisited(prev => Math.max(prev, currentRetro.phase));
    } else {
      setMaxPhaseVisited(1);
    }
  }, [currentRetro?.phase, currentRetro, hasJoined]);

  const handleAbort = () => {
    if (window.confirm('Are you sure you want to abort this retrospective session? This will end the active session for all team members and erase all unsaved progress.')) {
      playClick();
      cancelRetro();
    }
  };

  const handleLeave = () => {
    if (window.confirm('Are you sure you want to leave this retrospective session? You can rejoin later as long as the session is still active.')) {
      playClick();
      leaveRetro();
    }
  };

  const renderActivePhase = () => {
    if (!currentRetro || !hasJoined) return <SetupPhase />;

    switch (currentRetro.phase) {
      case 1:
        return <GamePhase />;
      case 2:
        return <IcebreakerPhase />;
      case 3:
        return <PrevActionsPhase />;
      case 4:
        return <HealthCheckPhase />;
      case 5:
        return <AiAdoptionPhase />;
      case 6:
        return <DakiPhase />;
      case 7:
        return <PrioritizePhase />;
      case 8:
        return <ScorePhase />;
      default:
        return <GamePhase />;
    }
  };

  return (
    <div className="app-container">
      {/* Global Header */}
      <header className="w-full py-4 px-6 bg-slate-950/20 border-b border-white/5 backdrop-blur-md flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <LayoutGrid className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-wider text-slate-100 uppercase flex items-center gap-1.5">
              DAKI Retro Hub
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">
              {(!currentRetro || !hasJoined) ? 'Team Setup & History' : `Active Session • ${team?.name}`}
            </p>
          </div>
        </div>

        {currentRetro && hasJoined && (
          isFacilitator ? (
            <button
              onClick={handleAbort}
              className="flex items-center gap-1.5 text-xs text-rose-400/80 hover:text-rose-400 bg-rose-500/5 hover:bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/10 transition-colors"
            >
              <XOctagon className="w-4 h-4" />
              Abort Session
            </button>
          ) : (
            <button
              onClick={handleLeave}
              className="flex items-center gap-1.5 text-xs text-amber-400/80 hover:text-amber-400 bg-amber-500/5 hover:bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Leave Session
            </button>
          )
        )}
      </header>

      {/* Stepper indicators if inside active retro */}
      {currentRetro && hasJoined && (
        <Stepper
          currentPhase={currentRetro.phase}
          onPhaseSelect={setPhase}
          maxPhaseVisited={maxPhaseVisited}
        />
      )}

      {/* Main Content Area */}
      <main className="content-container flex-1">
        {renderActivePhase()}
      </main>

      {/* Footnote */}
      <footer className="w-full text-center py-4 text-[11px] text-slate-600 border-t border-white/5 bg-slate-950/20">
        DAKI Retro Hub • Built with React, TypeScript & Web Audio API Synthesizer
      </footer>
    </div>
  );
};

function App() {
  return (
    <RetroProvider>
      <AppContent />
    </RetroProvider>
  );
}

export default App;
