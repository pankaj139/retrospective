import React from 'react';
import { 
  Gamepad2, 
  Sparkles, 
  ListChecks, 
  Activity, 
  BrainCircuit,
  LayoutGrid, 
  TrendingUp, 
  Award,
  Trophy
} from 'lucide-react';
import { playClick } from '../utils/sound';

interface StepperProps {
  currentPhase: number;
  onPhaseSelect: (phase: number) => void;
  maxPhaseVisited: number;
}

const PHASES = [
  { label: 'Warmup Game', icon: Gamepad2 },
  { label: 'Icebreaker', icon: Sparkles },
  { label: 'Prev Actions', icon: ListChecks },
  { label: 'Health Check', icon: Activity },
  { label: 'AI Adoption', icon: BrainCircuit },
  { label: 'DAKI Board', icon: LayoutGrid },
  { label: 'Prioritize', icon: TrendingUp },
  { label: 'Star of Release', icon: Trophy },
  { label: 'Retro Score', icon: Award }
];


export const Stepper: React.FC<StepperProps> = ({
  currentPhase,
  onPhaseSelect,
  maxPhaseVisited
}) => {
  return (
    <div className="w-full flex items-center justify-between overflow-x-auto py-3 px-4 border-b border-white/5" style={{ background: 'rgba(8, 10, 20, 0.96)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
      <div className="max-w-6xl mx-auto w-full flex items-center justify-between min-w-[700px] px-4">
        {PHASES.map((phase, index) => {
          const phaseNum = index + 1;
          const isActive = phaseNum === currentPhase;
          const isCompleted = phaseNum < currentPhase;
          const isPlayable = phaseNum <= maxPhaseVisited || isCompleted || isActive;
          const Icon = phase.icon;

          return (
            <React.Fragment key={phase.label}>
              {/* Step circle */}
              <button
                disabled={!isPlayable}
                onClick={() => {
                  if (isPlayable) {
                    playClick();
                    onPhaseSelect(phaseNum);
                  }
                }}
                className={`flex flex-col items-center gap-1.5 focus:outline-none transition-all duration-300 relative group
                  ${isPlayable ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}
                `}
              >
                <div 
                  className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-300
                    ${isActive 
                      ? 'bg-indigo-600 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)] scale-110 text-white' 
                      : isCompleted 
                        ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-400' 
                        : 'bg-slate-900 border-slate-800 text-slate-400 group-hover:border-slate-700'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                </div>
                
                <span 
                  className={`text-[11px] font-medium tracking-wide whitespace-nowrap transition-colors duration-300
                    ${isActive 
                      ? 'text-indigo-400 font-semibold' 
                      : isCompleted 
                        ? 'text-emerald-500/80' 
                        : 'text-slate-400'
                    }
                  `}
                >
                  {phase.label}
                </span>

                {/* Sub indicator dots/details */}
                {isActive && (
                  <span className="absolute -top-1 w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,1)] animate-ping" />
                )}
              </button>

              {/* Connecting line */}
              {index < PHASES.length - 1 && (
                <div className="flex-1 mx-2 h-[2px] min-w-[20px] relative rounded-full bg-slate-900 overflow-hidden">
                  <div 
                    className={`absolute inset-y-0 left-0 transition-all duration-500 rounded-full
                      ${isCompleted 
                        ? 'w-full bg-emerald-500/50' 
                        : isActive 
                          ? 'w-1/2 bg-indigo-500' 
                          : 'w-0 bg-transparent'
                      }
                    `}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
