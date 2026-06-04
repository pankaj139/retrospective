import React, { useEffect, useState } from 'react';
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
import { StarOfReleasePhase } from './phases/StarOfReleasePhase';
import { ScorePhase } from './phases/ScorePhase';
import { playClick } from './utils/sound';
import { LayoutGrid, XOctagon, LogOut, SkipForward, Moon, Sun, User } from 'lucide-react';
import './App.css';

type ThemeMode = 'dark' | 'light';

const THEME_STORAGE_KEY = 'daki_retro_theme';

const PHASE_LABELS = [
  'Warmup Game', 'Icebreaker', 'Prev Actions', 'Health Check',
  'AI Adoption', 'DAKI Board', 'Prioritize', 'Star of Release', 'Retro Score'
];

interface AppContentProps {
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
}

const AppContent: React.FC<AppContentProps> = ({ theme, onThemeChange }) => {
  const { currentRetro, setPhase, nextPhase, teams, selectedTeamId, cancelRetro, leaveRetro, hasJoined, currentUserMemberId, authUser, signOutUser } = useRetro();
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const team = teams.find(t => t.id === selectedTeamId) || teams[0];
  const activeMember = team?.members.find(member => member.id === currentUserMemberId);
  const isFacilitator = !currentRetro?.createdBy || currentRetro.createdBy === currentUserMemberId;

  const handleSignOutClick = async () => {
    playClick();
    setShowProfileDropdown(false);
    await signOutUser();
  };

  const maxPhaseVisited = currentRetro && hasJoined ? currentRetro.phase : 1;

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

  const handleSkipSection = () => {
    setShowSkipConfirm(true);
  };

  const handleThemeChange = (nextTheme: ThemeMode) => {
    if (nextTheme !== theme) {
      playClick();
      onThemeChange(nextTheme);
    }
  };

  const confirmSkip = () => {
    playClick();
    nextPhase();
    setShowSkipConfirm(false);
  };

  const renderActivePhase = () => {
    if (!currentRetro || !hasJoined) return <SetupPhase />;

    if (currentRetro.status === 'scheduled') {
      return <DakiPhase />;
    }

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
        return <StarOfReleasePhase />;
      case 9:
        return <ScorePhase />;
      default:
        return <GamePhase />;
    }
  };

  return (
    <div className="app-container">
      {/* Global Header */}
      <header className="app-header w-full py-4 px-6 flex items-center justify-between z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <LayoutGrid className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-wider text-slate-100 uppercase flex items-center gap-1.5">
              {currentRetro?.retroName || 'DAKI Retro Hub'}
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">
              {(!currentRetro || !hasJoined)
                ? 'Team Setup & History'
                : currentRetro.status === 'scheduled'
                  ? `Pre-Retro Prep • ${team?.name}${activeMember ? ` • ${activeMember.emoji} ${activeMember.name}` : ''}`
                  : `Active Session • ${team?.name}${activeMember ? ` • ${activeMember.emoji} ${activeMember.name}` : ''}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap justify-end">
          <div className="theme-switcher" role="group" aria-label="Theme selector">
            <button
              type="button"
              onClick={() => handleThemeChange('dark')}
              className={`theme-switcher-button ${theme === 'dark' ? 'active' : ''}`}
              aria-pressed={theme === 'dark'}
            >
              <Moon className="w-3.5 h-3.5" />
              Dark
            </button>
            <button
              type="button"
              onClick={() => handleThemeChange('light')}
              className={`theme-switcher-button ${theme === 'light' ? 'active' : ''}`}
              aria-pressed={theme === 'light'}
            >
              <Sun className="w-3.5 h-3.5" />
              Light
            </button>
          </div>

          {authUser && (
            <div className="profile-dropdown-container">
              {showProfileDropdown && (
                <div 
                  className="profile-dropdown-backdrop" 
                  onClick={() => setShowProfileDropdown(false)} 
                />
              )}
              <button
                type="button"
                onClick={() => { playClick(); setShowProfileDropdown(!showProfileDropdown); }}
                className="profile-trigger-btn"
                aria-haspopup="true"
                aria-expanded={showProfileDropdown}
              >
                <span className="profile-trigger-avatar">
                  {activeMember ? activeMember.emoji : (authUser.email ? authUser.email[0].toUpperCase() : <User className="w-3.5 h-3.5" />)}
                </span>
                <span className="truncate max-w-[100px]">
                  {activeMember ? activeMember.name : (authUser.email ? authUser.email.split('@')[0] : 'Profile')}
                </span>
              </button>

              {showProfileDropdown && (
                <div className="profile-dropdown-menu">
                  <div className="profile-dropdown-info">
                    <div className="profile-dropdown-label">Signed In As</div>
                    <div className="profile-dropdown-email" title={authUser.email || ''}>
                      {authUser.email || 'Authenticated User'}
                    </div>
                  </div>

                  {activeMember && (
                    <div className="profile-dropdown-member">
                      <span className="profile-dropdown-member-emoji">{activeMember.emoji}</span>
                      <div className="profile-dropdown-member-details">
                        <div className="profile-dropdown-member-name">{activeMember.name}</div>
                        <div className="profile-dropdown-member-role">{activeMember.role || 'Member'}</div>
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSignOutClick}
                    className="profile-dropdown-action"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          )}

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
        </div>
      </header>

      {/* Stepper indicators if inside active retro */}
      {currentRetro && hasJoined && currentRetro.status !== 'scheduled' && (
        <div style={{ position: 'sticky', top: '65px', zIndex: 30 }}>
          <Stepper
            currentPhase={currentRetro.phase}
            onPhaseSelect={setPhase}
            maxPhaseVisited={maxPhaseVisited}
          />
        </div>
      )}

      {/* Main Content Area */}
      <main className="content-container flex-1">
        {renderActivePhase()}
      </main>

      {/* Skip Section – Moderator only, not on final phase */}
      {currentRetro && hasJoined && isFacilitator && currentRetro.phase < 9 && (
        <button
          id="skip-section-btn"
          onClick={handleSkipSection}
          className="skip-section-fab"
          title="Skip this section (moderator only)"
        >
          <SkipForward className="w-4 h-4" />
          <span>Skip Section</span>
        </button>
      )}

      {/* Skip confirmation modal */}
      {showSkipConfirm && (
        <div className="skip-confirm-backdrop" onClick={() => setShowSkipConfirm(false)}>
          <div className="skip-confirm-card" onClick={e => e.stopPropagation()}>
            <div className="skip-confirm-icon">
              <SkipForward className="w-6 h-6" />
            </div>
            <h3 className="skip-confirm-title">Skip this section?</h3>
            <p className="skip-confirm-desc">
              You're about to skip&nbsp;
              <span className="skip-confirm-phase">
                {PHASE_LABELS[(currentRetro?.phase ?? 1) - 1]}
              </span>
              &nbsp;and move to the next section. This action will affect all participants.
            </p>
            <div className="skip-confirm-actions">
              <button
                id="skip-cancel-btn"
                onClick={() => setShowSkipConfirm(false)}
                className="skip-cancel-btn"
              >
                Cancel
              </button>
              <button
                id="skip-confirm-btn"
                onClick={confirmSkip}
                className="skip-do-btn"
              >
                <SkipForward className="w-4 h-4" />
                Yes, Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footnote */}
      <footer className="app-footer w-full text-center py-4 text-[11px] text-slate-600">
        DAKI Retro Hub • Built with React, TypeScript & Web Audio API Synthesizer
      </footer>
    </div>
  );
};

function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') {
      return 'dark';
    }

    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === 'dark' || storedTheme === 'light') {
      return storedTheme;
    }

    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  return (
    <RetroProvider>
      <AppContent theme={theme} onThemeChange={setTheme} />
    </RetroProvider>
  );
}

export default App;
