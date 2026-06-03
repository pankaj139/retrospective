import React, { useEffect, useRef, useState } from 'react';
import { useRetro } from '../context/RetroContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { playPop, playScore, playBuzzer, playClick } from '../utils/sound';
import { Gamepad2, Play, Trophy, ArrowRight, Volume2 } from 'lucide-react';

interface Balloon {
  id: string;
  x: number;
  y: number;
  radius: number;
  speed: number;
  color: string;
  popped: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  size: number;
}

interface ScoreText {
  x: number;
  y: number;
  text: string;
  alpha: number;
}

export const GamePhase: React.FC = () => {
  const { currentRetro, teams, selectedTeamId, startGame, updateGameScore, nextPhase, currentUserMemberId } = useRetro();
  const team = teams.find(t => t.id === selectedTeamId) || teams[0];
  const isFacilitator = !currentRetro?.createdBy || currentRetro.createdBy === currentUserMemberId;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameStartedOnce, setGameStartedOnce] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [myScore, setMyScore] = useState(0);
  
  // Canvas animation refs
  const balloonsRef = useRef<Balloon[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const scoresRef = useRef<ScoreText[]>([]);
  
  // Audio state
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Listen to multiplayer game start events from Supabase
  useEffect(() => {
    if (!currentRetro || currentRetro.gameStatus !== 'playing' || !currentRetro.gameStartedAt) {
      setIsPlaying(false);
      return;
    }

    // Calculate remaining time based on start timestamp
    const startMs = new Date(currentRetro.gameStartedAt).getTime();
    const elapsedSeconds = Math.floor((Date.now() - startMs) / 1000);
    const remaining = 30 - elapsedSeconds;

    if (remaining > 0) {
      setIsPlaying(true);
      setGameStartedOnce(true);
      setTimeLeft(remaining);
      setMyScore(0);

      // Clear animation arrays
      balloonsRef.current = [];
      particlesRef.current = [];
      scoresRef.current = [];

      // Pre-populate some balloons
      for (let i = 0; i < 6; i++) {
        spawnBalloon(true);
      }
    } else {
      setIsPlaying(false);
      setGameStartedOnce(true);
      setTimeLeft(0);
    }
  }, [currentRetro?.gameStatus, currentRetro?.gameStartedAt]);

  // Handle countdown
  useEffect(() => {
    let timer: any;
    if (isPlaying && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleGameOver();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPlaying, timeLeft]);

  const handleGameOver = () => {
    setIsPlaying(false);
    if (soundEnabled) {
      playBuzzer();
      setTimeout(() => playScore(), 300);
    }
  };

  const triggerGameStart = () => {
    playClick();
    startGame();
  };

  const spawnBalloon = (randomY = false) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    
    const colors = [
      '#f43f5e', // Drop (Rose)
      '#10b981', // Add (Emerald)
      '#f59e0b', // Keep (Amber)
      '#06b6d4', // Improve (Cyan)
      '#6366f1', // Brand (Indigo)
      '#a855f7'  // Violet
    ];

    const radius = 22 + Math.random() * 12;
    const x = radius + Math.random() * (canvas.width - radius * 2);
    const y = randomY 
      ? radius + Math.random() * (canvas.height - radius * 2 - 100) 
      : canvas.height + radius;
    
    // Golden balloon chance!
    const isGold = Math.random() > 0.92;
    const color = isGold ? '#fbbf24' : colors[Math.floor(Math.random() * colors.length)];

    balloonsRef.current.push({
      id: Math.random().toString(),
      x,
      y,
      radius,
      speed: 0.8 + Math.random() * 1.2 + (isGold ? 0.8 : 0),
      color,
      popped: false
    });
  };

  const createPopParticles = (x: number, y: number, color: string) => {
    const count = 12 + Math.floor(Math.random() * 8);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1, // tend to go upwards slightly
        color,
        alpha: 1,
        size: 2 + Math.random() * 4
      });
    }
  };

  const createFloatingScore = (x: number, y: number, text: string) => {
    scoresRef.current.push({ x, y, text, alpha: 1 });
  };

  // Main Canvas loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameId: number;

    const render = () => {
      // Clear canvas with deep transparent dark overlay to support trail
      ctx.fillStyle = '#090a0f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw background grid lines for premium aesthetics
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      if (isPlaying) {
        // Spawn balloons randomly
        if (Math.random() < 0.05 && balloonsRef.current.length < 12) {
          spawnBalloon();
        }

        // Draw and update balloons
        balloonsRef.current.forEach((balloon, index) => {
          balloon.y -= balloon.speed;

          // Draw balloon string
          ctx.beginPath();
          ctx.moveTo(balloon.x, balloon.y + balloon.radius);
          ctx.quadraticCurveTo(
            balloon.x - 5, balloon.y + balloon.radius + 15,
            balloon.x + 3, balloon.y + balloon.radius + 35
          );
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Draw balloon base triangle
          ctx.beginPath();
          ctx.moveTo(balloon.x, balloon.y + balloon.radius);
          ctx.lineTo(balloon.x - 6, balloon.y + balloon.radius + 8);
          ctx.lineTo(balloon.x + 6, balloon.y + balloon.radius + 8);
          ctx.closePath();
          ctx.fillStyle = balloon.color;
          ctx.fill();

          // Draw balloon body
          ctx.beginPath();
          ctx.arc(balloon.x, balloon.y, balloon.radius, 0, Math.PI * 2);
          ctx.fillStyle = balloon.color;
          ctx.fill();

          // Add balloon sheen / glare
          ctx.beginPath();
          ctx.arc(balloon.x - balloon.radius * 0.35, balloon.y - balloon.radius * 0.35, balloon.radius * 0.2, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.fill();

          // Remove offscreen balloons
          if (balloon.y < -balloon.radius) {
            balloonsRef.current.splice(index, 1);
          }
        });
      }

      // Draw and update particles
      particlesRef.current.forEach((p, index) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05; // gravity
        p.alpha -= 0.025; // fade

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.restore();

        if (p.alpha <= 0) {
          particlesRef.current.splice(index, 1);
        }
      });

      // Draw floating scores
      scoresRef.current.forEach((s, index) => {
        s.y -= 1.2;
        s.alpha -= 0.02;

        ctx.save();
        ctx.globalAlpha = Math.max(0, s.alpha);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(99, 102, 241, 0.8)';
        ctx.shadowBlur = 8;
        ctx.font = 'bold 16px Outfit, sans-serif';
        ctx.fillText(s.text, s.x, s.y);
        ctx.restore();

        if (s.alpha <= 0) {
          scoresRef.current.splice(index, 1);
        }
      });

      // Overlay if not playing
      if (!isPlaying) {
        ctx.fillStyle = 'rgba(10, 11, 16, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px Outfit, sans-serif';
        
        if (!gameStartedOnce) {
          ctx.fillText('⚡ RETRO WARMUP: BALLOON SHOOTER', canvas.width / 2, canvas.height / 2 - 30);
          ctx.fillStyle = '#9ca3af';
          ctx.font = '14px Outfit, sans-serif';
          ctx.fillText('Pop as many balloons as you can in 30 seconds!', canvas.width / 2, canvas.height / 2 + 10);
          ctx.fillText('Click to shoot. Golden balloons grant double points.', canvas.width / 2, canvas.height / 2 + 35);
        } else {
          ctx.fillText('🏁 GAME OVER!', canvas.width / 2, canvas.height / 2 - 30);
          ctx.fillStyle = '#fbbf24';
          ctx.font = 'bold 18px Outfit, sans-serif';
          ctx.fillText(`Your Score: ${myScore} pts`, canvas.width / 2, canvas.height / 2 + 10);
          ctx.fillStyle = '#9ca3af';
          ctx.font = '14px Outfit, sans-serif';
          ctx.fillText('Review leaderboard and click next to begin the icebreaker!', canvas.width / 2, canvas.height / 2 + 40);
        }
      }

      frameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [isPlaying, myScore, gameStartedOnce]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPlaying || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Scale coordinates based on display vs internal resolution to avoid offset click bugs
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    let hit = false;

    // Check hit starting from top-most balloon (drawn last)
    for (let i = balloonsRef.current.length - 1; i >= 0; i--) {
      const balloon = balloonsRef.current[i];
      const dist = Math.hypot(clickX - balloon.x, clickY - balloon.y);

      if (dist <= balloon.radius + 8) { // buffer
        balloon.popped = true;
        
        // Pop particles
        createPopParticles(balloon.x, balloon.y, balloon.color);
        
        // Points calculation
        const isGold = balloon.color === '#fbbf24';
        const points = isGold ? 200 : 100;
        const newScore = myScore + points;
        setMyScore(newScore);
        
        // Save to database in real-time
        if (currentUserMemberId) {
          updateGameScore(currentUserMemberId, newScore);
        }
        
        // Floating point indicator
        createFloatingScore(balloon.x, balloon.y - 15, isGold ? `+${points} GOLD!` : `+${points}`);
        
        // Play Pop Audio Context Sound
        if (soundEnabled) {
          playPop(isGold ? 600 : 350 + Math.random() * 100);
        }

        // Remove balloon
        balloonsRef.current.splice(i, 1);
        hit = true;
        break;
      }
    }

    // Play click sound if missed
    if (!hit && soundEnabled) {
      playClick();
    }
  };

  const handleNextPhase = () => {
    playClick();
    nextPhase();
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h1 className="title-large flex items-center gap-3">
            <Gamepad2 className="w-9 h-9 text-indigo-400" />
            Warmup Game
          </h1>
          <p className="subtitle">Let's shake off the daily stress and shoot some balloons together!</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSoundEnabled(prev => !prev)}
            icon={<Volume2 className={`w-4 h-4 ${soundEnabled ? 'text-indigo-400' : 'text-slate-500'}`} />}
          >
            {soundEnabled ? 'Mute' : 'Unmute'}
          </Button>
          {gameStartedOnce && !isPlaying && isFacilitator && (
            <Button
              variant="success"
              icon={<ArrowRight className="w-4 h-4" />}
              iconRight
              onClick={handleNextPhase}
              glow
            >
              Start Icebreaker
            </Button>
          )}
          {!isFacilitator && (
            <span className="text-xs text-slate-400 italic bg-white/5 border border-white/5 px-3 py-1.5 rounded-lg">
              Waiting for facilitator...
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Game Area */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex justify-between items-center px-4 py-2 bg-slate-950/40 border border-white/5 rounded-xl">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-xs text-slate-400 uppercase tracking-wider block">Time Left</span>
                <span className={`text-xl font-bold ${timeLeft <= 5 ? 'text-rose-500 animate-pulse font-extrabold' : 'text-emerald-400'}`}>
                  {timeLeft}s
                </span>
              </div>
              <div className="w-[1px] h-8 bg-white/10" />
              <div>
                <span className="text-xs text-slate-400 uppercase tracking-wider block">Your Score</span>
                <span className="text-xl font-bold text-indigo-400">{myScore}</span>
              </div>
            </div>
            
            {!isPlaying ? (
              isFacilitator ? (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Play className="w-4 h-4 fill-current" />}
                  onClick={triggerGameStart}
                  glow
                >
                  {gameStartedOnce ? 'Play Again' : 'Start Game'}
                </Button>
              ) : (
                <span className="text-xs text-indigo-400 uppercase font-semibold animate-pulse">
                  🎮 Waiting for facilitator to start the game...
                </span>
              )
            ) : (
              <span className="text-xs text-indigo-400 uppercase font-semibold animate-pulse">
                🔫 Click balloons to shoot!
              </span>
            )}
          </div>

          <div className="game-canvas-wrapper flex items-center justify-center">
            <canvas
              ref={canvasRef}
              width={640}
              height={400}
              onClick={handleCanvasClick}
              className={`w-full h-full cursor-crosshair transition-all duration-300 ${isPlaying ? 'bg-slate-950' : ''}`}
            />
          </div>
        </div>

        {/* Live Leaderboard */}
        <Card padding="lg" className="flex flex-col h-full justify-between">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4 border-b border-white/5 pb-3">
              <Trophy className="w-5 h-5 text-amber-400" />
              Team Leaderboard
            </h2>
            
            <div className="flex flex-col gap-2.5 max-h-[300px] overflow-y-auto pr-1">
              {team.members
                .filter(member =>
                  member.id === currentUserMemberId ||
                  currentRetro?.gameScores[member.id] !== undefined
                )
                .map((member) => {
                const isMe = member.id === currentUserMemberId;
                // Optimistic local update during play for active user, DB sync for others
                const displayScore = isMe ? myScore : (currentRetro?.gameScores[member.id] || 0);

                return (
                  <div 
                    key={member.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200
                      ${isMe 
                        ? 'bg-indigo-600/10 border-indigo-500/30' 
                        : 'bg-white/5 border-white/5'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl">{member.emoji}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate flex items-center gap-1.5">
                          {member.name}
                          {isMe && (
                            <span className="text-[9px] bg-indigo-500 text-white font-normal px-1 rounded">
                              YOU
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">{member.role}</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-slate-100 font-mono">
                      {displayScore} <span className="text-[10px] text-slate-500 font-normal">pts</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {!isPlaying && !gameStartedOnce && (
            <div className="mt-4 text-xs text-slate-500 italic text-center">
              Press "Start Game" above to launch the timer! Teammates will pop balloons in real-time alongside you.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
