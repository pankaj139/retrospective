import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { 
  type Team, 
  type TeamMember, 
  type ActionItem, 
  type RetroSession, 
  type DakiCard,
  MOCK_TEAMS,
  ICEBREAKER_QUESTIONS
} from '../utils/mockData';

interface RetroContextType {
  teams: Team[];
  selectedTeamId: string;
  currentRetro: RetroSession | null;
  history: RetroSession[];
  previousActionItems: ActionItem[];
  currentUserMemberId: string;
  setCurrentUserMemberId: (id: string) => void;
  selectTeam: (teamId: string) => void;
  createTeam: (name: string, members: Omit<TeamMember, 'id'>[]) => Promise<Team | null>;
  startRetro: () => Promise<void>;
  nextPhase: () => void;
  prevPhase: () => void;
  setPhase: (phase: number) => void;
  startGame: () => Promise<void>;
  setIcebreakerQuestion: (question: string) => Promise<void>;
  updateGameScore: (memberId: string, score: number) => Promise<void>;
  setIcebreakerAnswer: (memberId: string, answer: string) => Promise<void>;
  setHealthScore: (memberId: string, metricId: string, score: number) => Promise<void>;
  setAiAdoptionScore: (memberId: string, questionId: string, score: number) => Promise<void>;
  addDakiCard: (column: 'drop' | 'add' | 'keep' | 'improve', content: string, authorId: string, category?: string) => Promise<void>;
  voteDakiCard: (cardId: string, memberId: string) => Promise<void>;
  deleteDakiCard: (cardId: string) => Promise<void>;
  addActionItem: (description: string, assigneeId: string, dueDate: string) => Promise<void>;
  updatePrevActionItemStatus: (itemId: string, status: ActionItem['status']) => Promise<void>;
  setRetroScore: (score: number, feedback: string) => Promise<void>;
  completeRetro: () => Promise<void>;
  cancelRetro: () => Promise<void>;
  leaveRetro: () => void;
  addSimulatedDakiCard: () => Promise<void>;
  addTeamMember: (teamId: string, name: string, role: string, emoji: string) => Promise<TeamMember | null>;
  hasJoined: boolean;
  joinRetro: () => void;
  isUsingMockData: boolean;
  loading: boolean;
}

const RetroContext = createContext<RetroContextType | undefined>(undefined);

// Map database card structure to client structure
const mapCardFromDb = (dbCard: any): DakiCard => ({
  id: dbCard.id,
  column: dbCard.column_name as 'drop' | 'add' | 'keep' | 'improve',
  content: dbCard.content,
  votes: dbCard.votes,
  authorId: dbCard.author_id,
  authorName: dbCard.author_name,
  authorEmoji: dbCard.author_emoji,
  category: dbCard.category,
  isSimulated: dbCard.is_simulated,
  votedBy: dbCard.voted_by || []
});

export const RetroProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [history, setHistory] = useState<RetroSession[]>([]);
  const [previousActionItems, setPreviousActionItems] = useState<ActionItem[]>([]);
  const [currentRetro, setCurrentRetro] = useState<RetroSession | null>(null);

  // Tracks active viewer member ID to support simulated multi-client actions
  const [currentUserMemberId, setCurrentUserMemberId] = useState<string>(() => {
    return localStorage.getItem('daki_retro_member_id') || '';
  });

  // Save member ID locally
  useEffect(() => {
    if (currentUserMemberId) {
      localStorage.setItem('daki_retro_member_id', currentUserMemberId);
    }
  }, [currentUserMemberId]);

  const [hasJoined, setHasJoined] = useState<boolean>(() => {
    return sessionStorage.getItem('daki_retro_joined') === 'true';
  });

  const [isUsingMockData, setIsUsingMockData] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);

  // 1. Initial Load: Fetch teams, members, and session history
  useEffect(() => {
    const fetchTeamsAndHistory = async () => {
      try {
        const { data: dbTeams, error: teamsError } = await supabase.from('teams').select('*').order('name');
        console.log('[RetroHub] Database fetch teams:', dbTeams, 'Error:', teamsError);

        if (teamsError) throw teamsError;

        if (dbTeams && dbTeams.length > 0) {
          const teamsWithMembers = await Promise.all(
            dbTeams.map(async (t: any) => {
              const { data: m, error: memError } = await supabase.from('team_members').select('*').eq('team_id', t.id);
              if (memError) {
                console.error('[RetroHub] Error fetching members for team', t.name, memError);
              }
              return {
                id: t.id,
                name: t.name,
                members: (m || []).map((member: any) => ({
                  id: member.id,
                  name: member.name,
                  role: member.role,
                  emoji: member.emoji
                }))
              };
            })
          );
          console.log('[RetroHub] Loaded teams with members from Supabase:', teamsWithMembers);
          setTeams(teamsWithMembers);
          setIsUsingMockData(false);
          
          // Auto-select first team (validating against loaded list)
          const savedTeamId = localStorage.getItem('daki_retro_selected_team') || '';
          const teamExists = teamsWithMembers.some(t => t.id === savedTeamId);
          const defaultTeamId = teamExists ? savedTeamId : teamsWithMembers[0].id;
          setSelectedTeamId(defaultTeamId);
        } else {
          console.log('[RetroHub] Database connected, but contains no teams.');
          setTeams([]);
          setSelectedTeamId('');
          setIsUsingMockData(false);
        }
      } catch (err) {
        console.error('[RetroHub] Exception in fetchTeamsAndHistory:', err);
        // Fallback to local MOCK if connection fails
        setTeams(MOCK_TEAMS);
        setSelectedTeamId(MOCK_TEAMS[0].id);
        setIsUsingMockData(true);
      } finally {
        setLoading(false);
      }

      // Fetch completed retros
      const { data: dbSessions } = await supabase
        .from('retro_sessions')
        .select('*')
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (dbSessions) {
        const sessionsWithDetails = await Promise.all(
          dbSessions.map(async (s: any) => {
            const { data: cards } = await supabase.from('daki_cards').select('*').eq('session_id', s.id);
            const { data: actions } = await supabase.from('action_items').select('*').eq('session_id', s.id);
            const { data: games } = await supabase.from('game_scores').select('*').eq('session_id', s.id);
            const { data: ice } = await supabase.from('icebreaker_answers').select('*').eq('session_id', s.id);
            const { data: health } = await supabase.from('health_check_scores').select('*').eq('session_id', s.id);
            const { data: aiScores } = await supabase.from('ai_adoption_scores').select('*').eq('session_id', s.id);

            const gameScores: Record<string, number> = {};
            games?.forEach(g => { gameScores[g.member_id] = g.score; });

            const icebreakerAnswers: Record<string, string> = {};
            ice?.forEach(i => { icebreakerAnswers[i.member_id] = i.answer; });

            const healthCheckScores: Record<string, Record<string, number>> = {};
            health?.forEach(h => {
              if (h.member_id) {
                if (!healthCheckScores[h.member_id]) {
                  healthCheckScores[h.member_id] = {};
                }
                healthCheckScores[h.member_id][h.metric_id] = Number(h.score);
              }
            });

            const aiAdoptionScores: Record<string, Record<string, number>> = {};
            aiScores?.forEach(a => {
              if (a.member_id) {
                if (!aiAdoptionScores[a.member_id]) {
                  aiAdoptionScores[a.member_id] = {};
                }
                aiAdoptionScores[a.member_id][a.question_id] = Number(a.score);
              }
            });

            return {
              id: s.id,
              teamId: s.team_id,
              date: s.date,
              phase: s.phase,
              gameScores,
              icebreakerAnswers,
              healthCheckScores,
              aiAdoptionScores,
              dakiCards: (cards || []).map(mapCardFromDb),
              actionItems: (actions || []).map((a: any) => ({
                id: a.id,
                description: a.description,
                assigneeId: a.assignee_id,
                dueDate: a.due_date,
                status: a.status,
                createdInRetro: a.created_in_retro
              })),
              retroScore: s.retro_score,
              retroFeedback: s.retro_feedback
            };
          })
        );
        setHistory(sessionsWithDetails);
      }
    };

    fetchTeamsAndHistory();
  }, []);

  // Realtime subscription for teams and team_members table changes globally
  useEffect(() => {
    const teamsChannel = supabase
      .channel('public_teams_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams' },
        async (payload: any) => {
          console.log('[RetroHub] Realtime Team Event:', payload);
          if (payload.eventType === 'INSERT') {
            const newTeam = payload.new;
            setTeams(prev => {
              if (prev.some(t => t.id === newTeam.id)) return prev;
              return [...prev, { id: newTeam.id, name: newTeam.name, members: [] }].sort((a, b) => a.name.localeCompare(b.name));
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedTeam = payload.new;
            setTeams(prev => prev.map(t => (t.id === updatedTeam.id ? { ...t, name: updatedTeam.name } : t)));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setTeams(prev => prev.filter(t => t.id !== deletedId));
          }
        }
      )
      .subscribe();

    const membersChannel = supabase
      .channel('public_members_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'team_members' },
        (payload: any) => {
          console.log('[RetroHub] Realtime Member Event:', payload);
          if (payload.eventType === 'INSERT') {
            const newMember = payload.new;
            const formatted: TeamMember = {
              id: newMember.id,
              name: newMember.name,
              role: newMember.role,
              emoji: newMember.emoji
            };
            setTeams(prev => prev.map(t => {
              if (t.id === newMember.team_id) {
                if (t.members.some(m => m.id === formatted.id)) return t;
                return { ...t, members: [...t.members, formatted] };
              }
              return t;
            }));
          } else if (payload.eventType === 'UPDATE') {
            const updatedMember = payload.new;
            const formatted: TeamMember = {
              id: updatedMember.id,
              name: updatedMember.name,
              role: updatedMember.role,
              emoji: updatedMember.emoji
            };
            setTeams(prev => prev.map(t => {
              if (t.id === updatedMember.team_id) {
                return {
                  ...t,
                  members: t.members.map(m => (m.id === formatted.id ? formatted : m))
                };
              }
              return t;
            }));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setTeams(prev => prev.map(t => {
              return {
                ...t,
                members: t.members.filter(m => m.id !== deletedId)
              };
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(teamsChannel);
      supabase.removeChannel(membersChannel);
    };
  }, []);

  // 2. Active Session loader for selected team
  useEffect(() => {
    if (!selectedTeamId) return;
    localStorage.setItem('daki_retro_selected_team', selectedTeamId);

    const loadSessionAndActions = async () => {
      // Load previous unresolved actions
      const { data: prevActions } = await supabase
        .from('action_items')
        .select('*')
        .eq('team_id', selectedTeamId)
        .neq('status', 'Resolved');

      if (prevActions) {
        setPreviousActionItems(
          prevActions.map((a: any) => ({
            id: a.id,
            description: a.description,
            assigneeId: a.assignee_id,
            dueDate: a.due_date,
            status: a.status,
            createdInRetro: a.created_in_retro
          }))
        );
      } else {
        setPreviousActionItems([]);
      }

      // Check for active session
      const { data: activeSessions } = await supabase
        .from('retro_sessions')
        .select('*')
        .eq('team_id', selectedTeamId)
        .eq('status', 'active')
        .limit(1);

      if (activeSessions && activeSessions.length > 0) {
        const s = activeSessions[0];
        
        // Fetch session components
        const { data: cards } = await supabase.from('daki_cards').select('*').eq('session_id', s.id);
        const { data: actions } = await supabase.from('action_items').select('*').eq('session_id', s.id);
        const { data: games } = await supabase.from('game_scores').select('*').eq('session_id', s.id);
        const { data: ice } = await supabase.from('icebreaker_answers').select('*').eq('session_id', s.id);
        const { data: health } = await supabase.from('health_check_scores').select('*').eq('session_id', s.id);
        const { data: aiScores } = await supabase.from('ai_adoption_scores').select('*').eq('session_id', s.id);

        const gameScores: Record<string, number> = {};
        games?.forEach(g => { gameScores[g.member_id] = g.score; });

        const icebreakerAnswers: Record<string, string> = {};
        ice?.forEach(i => { icebreakerAnswers[i.member_id] = i.answer; });

        const healthCheckScores: Record<string, Record<string, number>> = {};
        health?.forEach(h => {
          if (!h.member_id) return;
          if (!healthCheckScores[h.member_id]) {
            healthCheckScores[h.member_id] = {};
          }
          healthCheckScores[h.member_id][h.metric_id] = Number(h.score);
        });

        const aiAdoptionScores: Record<string, Record<string, number>> = {};
        aiScores?.forEach(a => {
          if (!a.member_id) return;
          if (!aiAdoptionScores[a.member_id]) {
            aiAdoptionScores[a.member_id] = {};
          }
          aiAdoptionScores[a.member_id][a.question_id] = Number(a.score);
        });

        setCurrentRetro({
          id: s.id,
          teamId: s.team_id,
          date: s.date,
          phase: s.phase,
          gameScores,
          icebreakerAnswers,
          healthCheckScores,
          aiAdoptionScores,
          dakiCards: (cards || []).map(mapCardFromDb),
          actionItems: (actions || []).map((a: any) => ({
            id: a.id,
            description: a.description,
            assigneeId: a.assignee_id,
            dueDate: a.due_date,
            status: a.status,
            createdInRetro: a.created_in_retro
          })),
          retroScore: s.retro_score,
          retroFeedback: s.retro_feedback,
          gameStatus: s.game_status,
          gameStartedAt: s.game_started_at,
          icebreakerQuestion: s.icebreaker_question,
          createdBy: s.created_by
        });
      } else {
        setCurrentRetro(null);
      }
    };

    loadSessionAndActions();
  }, [selectedTeamId]);

  // If the selected team changes, verify if the current user member ID belongs to the new team.
  // If it doesn't, clear it to force selection.
  useEffect(() => {
    if (!selectedTeamId || teams.length === 0) return;
    const activeTeam = teams.find(t => t.id === selectedTeamId);
    if (activeTeam) {
      const isMember = activeTeam.members.some(m => m.id === currentUserMemberId);
      if (!isMember) {
        setCurrentUserMemberId('');
        localStorage.removeItem('daki_retro_member_id');
      }
    }
  }, [selectedTeamId, teams, currentUserMemberId]);

  // Realtime subscription for retro_sessions table changes
  useEffect(() => {
    if (!selectedTeamId) return;

    console.log(`[RetroHub] Subscribing to retro_sessions for team ${selectedTeamId}`);

    const channel = supabase
      .channel(`team_sessions_${selectedTeamId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'retro_sessions' 
        },
        async (payload: any) => {
          console.log('[RetroHub] Realtime Session Event received:', payload);
          
          if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setCurrentRetro(prev => {
              if (prev && prev.id === deletedId) {
                console.log('[RetroHub] Session was deleted/aborted, clearing state.');
                sessionStorage.removeItem('daki_retro_joined');
                setHasJoined(false);
                return null;
              }
              return prev;
            });
            return;
          }

          const s = payload.new;
          if (!s || s.team_id !== selectedTeamId) {
            console.log(`[RetroHub] Ignored session event for a different team: ${s?.team_id || 'unknown'}`);
            return;
          }

          if (payload.eventType === 'INSERT') {
            if (s.status === 'active') {
              console.log('[RetroHub] Active session started for our team! Loading details...');
              // Fetch details
              const { data: cards } = await supabase.from('daki_cards').select('*').eq('session_id', s.id);
              const { data: actions } = await supabase.from('action_items').select('*').eq('session_id', s.id);
              const { data: games } = await supabase.from('game_scores').select('*').eq('session_id', s.id);
              const { data: ice } = await supabase.from('icebreaker_answers').select('*').eq('session_id', s.id);
              const { data: health } = await supabase.from('health_check_scores').select('*').eq('session_id', s.id);
              const { data: aiScores } = await supabase.from('ai_adoption_scores').select('*').eq('session_id', s.id);

              const gameScores: Record<string, number> = {};
              games?.forEach(g => { gameScores[g.member_id] = g.score; });

              const icebreakerAnswers: Record<string, string> = {};
              ice?.forEach(i => { icebreakerAnswers[i.member_id] = i.answer; });

              const healthCheckScores: Record<string, Record<string, number>> = {};
              health?.forEach(h => {
                if (!h.member_id) return;
                if (!healthCheckScores[h.member_id]) {
                  healthCheckScores[h.member_id] = {};
                }
                healthCheckScores[h.member_id][h.metric_id] = Number(h.score);
              });

              const aiAdoptionScores: Record<string, Record<string, number>> = {};
              aiScores?.forEach(a => {
                if (!a.member_id) return;
                if (!aiAdoptionScores[a.member_id]) {
                  aiAdoptionScores[a.member_id] = {};
                }
                aiAdoptionScores[a.member_id][a.question_id] = Number(a.score);
              });

              setCurrentRetro({
                id: s.id,
                teamId: s.team_id,
                date: s.date,
                phase: s.phase,
                gameScores,
                icebreakerAnswers,
                healthCheckScores,
                aiAdoptionScores,
                dakiCards: (cards || []).map(mapCardFromDb),
                actionItems: (actions || []).map((a: any) => ({
                  id: a.id,
                  description: a.description,
                  assigneeId: a.assignee_id,
                  dueDate: a.due_date,
                  status: a.status,
                  createdInRetro: a.created_in_retro
                })),
                retroScore: s.retro_score,
                retroFeedback: s.retro_feedback,
                gameStatus: s.game_status,
                gameStartedAt: s.game_started_at,
                icebreakerQuestion: s.icebreaker_question,
                createdBy: s.created_by
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            if (s.status === 'completed') {
              console.log('[RetroHub] Session completed. Archiving...');
              sessionStorage.removeItem('daki_retro_joined');
              setHasJoined(false);
              setCurrentRetro(null);
              window.location.reload();
            } else if (s.status === 'active') {
              console.log('[RetroHub] Session phase updated to:', s.phase);
              setCurrentRetro(prev => {
                if (prev && prev.id === s.id) {
                  return {
                    ...prev,
                    phase: s.phase,
                    retroScore: s.retro_score,
                    retroFeedback: s.retro_feedback,
                    gameStatus: s.game_status,
                    gameStartedAt: s.game_started_at,
                    icebreakerQuestion: s.icebreaker_question,
                    createdBy: s.created_by
                  };
                }
                return prev;
              });
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`[RetroHub] Session channel status for team ${selectedTeamId}:`, status);
      });

    return () => {
      console.log(`[RetroHub] Unsubscribing from retro_sessions for team ${selectedTeamId}`);
      supabase.removeChannel(channel);
    };
  }, [selectedTeamId]);

  // 3. Realtime multiplayer channel subscriptions (sub-tables only)
  useEffect(() => {
    if (!currentRetro) return;

    const sessionId = currentRetro.id;

    // Listen to DAKI card modifications
    const cardsChannel = supabase
      .channel(`cards_${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'daki_cards', filter: `session_id=eq.${sessionId}` },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            const newCard = mapCardFromDb(payload.new);
            setCurrentRetro(prev => {
              if (!prev) return null;
              if (prev.dakiCards.some(c => c.id === newCard.id)) return prev;
              return { ...prev, dakiCards: [...prev.dakiCards, newCard] };
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedCard = mapCardFromDb(payload.new);
            setCurrentRetro(prev => {
              if (!prev) return null;
              return { ...prev, dakiCards: prev.dakiCards.map(c => (c.id === updatedCard.id ? updatedCard : c)) };
            });
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setCurrentRetro(prev => {
              if (!prev) return null;
              return { ...prev, dakiCards: prev.dakiCards.filter(c => c.id !== deletedId) };
            });
          }
        }
      )
      .subscribe();

    // Listen to game scores
    const gamesChannel = supabase
      .channel(`games_${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_scores', filter: `session_id=eq.${sessionId}` },
        (payload: any) => {
          const scoreRow = payload.new;
          setCurrentRetro(prev => {
            if (!prev) return null;
            return {
              ...prev,
              gameScores: { ...prev.gameScores, [scoreRow.member_id]: scoreRow.score }
            };
          });
        }
      )
      .subscribe();

    // Listen to icebreaker inputs
    const iceChannel = supabase
      .channel(`ice_${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'icebreaker_answers', filter: `session_id=eq.${sessionId}` },
        (payload: any) => {
          if (payload.eventType === 'DELETE') {
            const deletedRowId = payload.old.id;
            setCurrentRetro(prev => {
              if (!prev) return null;
              const newAnswers = { ...prev.icebreakerAnswers };
              const foundMemberId = Object.keys(newAnswers).find(mId => `${prev.id}-${mId}` === deletedRowId);
              if (foundMemberId) {
                delete newAnswers[foundMemberId];
              }
              return {
                ...prev,
                icebreakerAnswers: newAnswers
              };
            });
          } else {
            const row = payload.new;
            setCurrentRetro(prev => {
              if (!prev) return null;
              return {
                ...prev,
                icebreakerAnswers: { ...prev.icebreakerAnswers, [row.member_id]: row.answer }
              };
            });
          }
        }
      )
      .subscribe();

    // Listen to health dimensions
    const healthChannel = supabase
      .channel(`health_${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'health_check_scores', filter: `session_id=eq.${sessionId}` },
        (payload: any) => {
          const row = payload.new;
          if (!row || !row.member_id) return;
          setCurrentRetro(prev => {
            if (!prev) return null;
            const updatedScores = { ...prev.healthCheckScores };
            if (!updatedScores[row.member_id]) {
              updatedScores[row.member_id] = {};
            }
            updatedScores[row.member_id] = {
              ...updatedScores[row.member_id],
              [row.metric_id]: Number(row.score)
            };
            return {
              ...prev,
              healthCheckScores: updatedScores
            };
          });
        }
      )
      .subscribe();

    // Listen to AI adoption dimensions
    const aiAdoptionChannel = supabase
      .channel(`ai_adoption_${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ai_adoption_scores', filter: `session_id=eq.${sessionId}` },
        (payload: any) => {
          const row = payload.new;
          if (!row || !row.member_id) return;
          setCurrentRetro(prev => {
            if (!prev) return null;
            const updatedScores = { ...prev.aiAdoptionScores };
            if (!updatedScores[row.member_id]) {
              updatedScores[row.member_id] = {};
            }
            updatedScores[row.member_id] = {
              ...updatedScores[row.member_id],
              [row.question_id]: Number(row.score)
            };
            return {
              ...prev,
              aiAdoptionScores: updatedScores
            };
          });
        }
      )
      .subscribe();

    // Listen to newly created action items
    const actionsChannel = supabase
      .channel(`actions_${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'action_items' },
        (payload: any) => {
          const item = payload.new;
          if (payload.eventType === 'INSERT' && item.session_id === sessionId) {
            setCurrentRetro(prev => {
              if (!prev) return null;
              if (prev.actionItems.some(i => i.id === item.id)) return prev;
              return {
                ...prev,
                actionItems: [...prev.actionItems, {
                  id: item.id,
                  description: item.description,
                  assigneeId: item.assignee_id,
                  dueDate: item.due_date,
                  status: item.status,
                  createdInRetro: item.created_in_retro
                }]
              };
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(cardsChannel);
      supabase.removeChannel(gamesChannel);
      supabase.removeChannel(iceChannel);
      supabase.removeChannel(healthChannel);
      supabase.removeChannel(aiAdoptionChannel);
      supabase.removeChannel(actionsChannel);
    };
  }, [currentRetro?.id]);

  // Select team
  const selectTeam = (teamId: string) => {
    setSelectedTeamId(teamId);
  };

  // Create a new team in database
  const createTeam = async (name: string, members: Omit<TeamMember, 'id'>[]) => {
    const teamId = `team-${Date.now()}`;
    const { error: teamErr } = await supabase.from('teams').insert({ id: teamId, name });
    if (teamErr) return null;

    const formattedMembers = members.map((m, idx) => ({
      id: `m-${teamId}-${idx}`,
      team_id: teamId,
      name: m.name,
      role: m.role,
      emoji: m.emoji
    }));

    const { error: memErr } = await supabase.from('team_members').insert(formattedMembers);
    if (memErr) return null;

    const newTeam: Team = {
      id: teamId,
      name,
      members: formattedMembers.map(m => ({ id: m.id, name: m.name, role: m.role, emoji: m.emoji }))
    };

    setTeams(prev => [...prev, newTeam]);
    setSelectedTeamId(teamId);
    return newTeam;
  };

  // Add a new member to an existing team in database
  const addTeamMember = async (teamId: string, name: string, role: string, emoji: string) => {
    const memberId = `m-${teamId}-${Date.now()}`;
    const newMember = {
      id: memberId,
      team_id: teamId,
      name,
      role,
      emoji
    };

    const { error } = await supabase.from('team_members').insert(newMember);
    if (!error) {
      const formattedMember: TeamMember = { id: memberId, name, role, emoji };
      setTeams(prev => prev.map(t => {
        if (t.id === teamId) {
          return {
            ...t,
            members: [...t.members, formattedMember]
          };
        }
        return t;
      }));
      setCurrentUserMemberId(memberId);
      return formattedMember;
    }
    return null;
  };

  // Start new retro session
  const startRetro = async () => {
    const retroId = `retro-${Date.now()}`;
    const team = teams.find(t => t.id === selectedTeamId) || teams[0];
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const initialQuestion = ICEBREAKER_QUESTIONS[Math.floor(Math.random() * ICEBREAKER_QUESTIONS.length)];

    const { error } = await supabase.from('retro_sessions').insert({
      id: retroId,
      team_id: team.id,
      date: dateStr,
      phase: 1,
      status: 'active',
      icebreaker_question: initialQuestion,
      created_by: currentUserMemberId
    });

    if (!error) {
      sessionStorage.setItem('daki_retro_joined', 'true');
      setHasJoined(true);
      setCurrentRetro({
        id: retroId,
        teamId: team.id,
        date: dateStr,
        phase: 1,
        gameScores: {},
        icebreakerAnswers: {},
        healthCheckScores: {},
        aiAdoptionScores: {},
        dakiCards: [],
        actionItems: [],
        retroScore: 5,
        retroFeedback: '',
        gameStatus: 'not_started',
        icebreakerQuestion: initialQuestion,
        createdBy: currentUserMemberId
      });
    }
  };

  const joinRetro = () => {
    if (currentRetro) {
      sessionStorage.setItem('daki_retro_joined', 'true');
      setHasJoined(true);
    }
  };

  // Set phase index
  const setPhase = async (phase: number) => {
    if (!currentRetro) return;
    await supabase.from('retro_sessions').update({ phase }).eq('id', currentRetro.id);
  };

  const nextPhase = () => {
    if (currentRetro) setPhase(currentRetro.phase + 1);
  };

  const prevPhase = () => {
    if (currentRetro) setPhase(Math.max(1, currentRetro.phase - 1));
  };

  // Start game for all users in the session
  const startGame = async () => {
    if (!currentRetro) return;

    // Clear existing scores for this session to start fresh
    const { error: deleteError } = await supabase
      .from('game_scores')
      .delete()
      .eq('session_id', currentRetro.id);

    if (deleteError) {
      console.error('[RetroHub] Error clearing game scores:', deleteError);
    }

    // Update session status and start timestamp
    const { error: updateError } = await supabase
      .from('retro_sessions')
      .update({
        game_status: 'playing',
        game_started_at: new Date().toISOString()
      })
      .eq('id', currentRetro.id);

    if (updateError) {
      console.error('[RetroHub] Error starting game:', updateError);
    }
  };

  // Set icebreaker question for all users
  const setIcebreakerQuestion = async (q: string) => {
    if (!currentRetro) return;

    // Clear existing answers for this session to start fresh
    const { error: deleteError } = await supabase
      .from('icebreaker_answers')
      .delete()
      .eq('session_id', currentRetro.id);

    if (deleteError) {
      console.error('[RetroHub] Error clearing icebreaker answers:', deleteError);
    }

    // Update the question on the session
    const { error: updateError } = await supabase
      .from('retro_sessions')
      .update({ icebreaker_question: q })
      .eq('id', currentRetro.id);

    if (updateError) {
      console.error('[RetroHub] Error setting icebreaker question:', updateError);
    }
  };

  // Game scores (upsert total score directly)
  const updateGameScore = async (memberId: string, score: number) => {
    if (!currentRetro) return;
    const scoreId = `${currentRetro.id}-${memberId}`;
    
    await supabase.from('game_scores').upsert({
      id: scoreId,
      session_id: currentRetro.id,
      member_id: memberId,
      score: score
    });
  };

  // Icebreaker answers (upsert)
  const setIcebreakerAnswer = async (memberId: string, answer: string) => {
    if (!currentRetro) return;
    const id = `${currentRetro.id}-${memberId}`;
    await supabase.from('icebreaker_answers').upsert({
      id,
      session_id: currentRetro.id,
      member_id: memberId,
      answer
    });
  };

  // Health scores (upsert per member)
  const setHealthScore = async (memberId: string, metricId: string, score: number) => {
    if (!currentRetro) return;
    const id = `${currentRetro.id}-${memberId}-${metricId}`;
    await supabase.from('health_check_scores').upsert({
      id,
      session_id: currentRetro.id,
      member_id: memberId,
      metric_id: metricId,
      score
    });
  };

  // AI adoption scores (upsert per member)
  const setAiAdoptionScore = async (memberId: string, questionId: string, score: number) => {
    if (!currentRetro) return;
    const id = `${currentRetro.id}-${memberId}-${questionId}`;
    await supabase.from('ai_adoption_scores').upsert({
      id,
      session_id: currentRetro.id,
      member_id: memberId,
      question_id: questionId,
      score
    });
  };

  // Add DAKI card
  const addDakiCard = async (
    column: 'drop' | 'add' | 'keep' | 'improve',
    content: string,
    authorId: string,
    category?: string
  ) => {
    if (!currentRetro) return;
    const cardId = `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const team = teams.find(t => t.id === selectedTeamId);
    const author = team?.members.find(m => m.id === authorId);

    await supabase.from('daki_cards').insert({
      id: cardId,
      session_id: currentRetro.id,
      column_name: column,
      content,
      votes: 0,
      author_id: authorId,
      author_name: author?.name || 'Anonymous',
      author_emoji: author?.emoji || '👤',
      category: category || 'General',
      is_simulated: false
    });
  };

  // Toggle upvote DAKI card
  const voteDakiCard = async (cardId: string, memberId: string) => {
    if (!currentRetro || !memberId) return;
    
    // Fetch current votes, voted_by list, and author_id
    const { data } = await supabase
      .from('daki_cards')
      .select('votes, voted_by, author_id')
      .eq('id', cardId)
      .limit(1);

    if (data && data.length > 0) {
      const card = data[0];
      
      // Prevent voting on own cards
      if (card.author_id === memberId) {
        console.warn('[RetroHub] Cannot upvote own card.');
        return;
      }

      const votedByList: string[] = card.voted_by || [];
      const hasVoted = votedByList.includes(memberId);
      
      let newVotedBy: string[];
      let newVotes: number;

      if (hasVoted) {
        // Remove vote
        newVotedBy = votedByList.filter(id => id !== memberId);
        newVotes = Math.max(0, card.votes - 1);
      } else {
        // Add vote
        newVotedBy = [...votedByList, memberId];
        newVotes = card.votes + 1;
      }

      await supabase
        .from('daki_cards')
        .update({ 
          votes: newVotes, 
          voted_by: newVotedBy 
        })
        .eq('id', cardId);
    }
  };

  // Delete DAKI card
  const deleteDakiCard = async (cardId: string) => {
    await supabase.from('daki_cards').delete().eq('id', cardId);
  };

  // Add action item
  const addActionItem = async (description: string, assigneeId: string, dueDate: string) => {
    if (!currentRetro) return;
    const itemId = `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    await supabase.from('action_items').insert({
      id: itemId,
      team_id: selectedTeamId,
      session_id: currentRetro.id,
      description,
      assignee_id: assigneeId,
      due_date: dueDate,
      status: 'Open',
      created_in_retro: `Retro on ${currentRetro.date}`
    });
  };

  // Update previous action item status
  const updatePrevActionItemStatus = async (itemId: string, status: ActionItem['status']) => {
    await supabase.from('action_items').update({ status }).eq('id', itemId);
    
    // Update local state for immediate feedback
    setPreviousActionItems(prev => prev.map(i => (i.id === itemId ? { ...i, status } : i)));
  };

  // Final retro score feedback details
  const setRetroScore = async (score: number, feedback: string) => {
    if (!currentRetro) return;
    await supabase.from('retro_sessions').update({
      retro_score: score,
      retro_feedback: feedback
    }).eq('id', currentRetro.id);
  };

  // Complete retro and close session status
  const completeRetro = async () => {
    if (!currentRetro) return;
    await supabase.from('retro_sessions').update({ status: 'completed' }).eq('id', currentRetro.id);
    sessionStorage.removeItem('daki_retro_joined');
    setHasJoined(false);
  };

  // Cancel and clear current active session
  const cancelRetro = async () => {
    if (!currentRetro) return;
    await supabase.from('retro_sessions').delete().eq('id', currentRetro.id);
    sessionStorage.removeItem('daki_retro_joined');
    setHasJoined(false);
    setCurrentRetro(null);
  };

  // Leave active session returning to lobby
  const leaveRetro = () => {
    sessionStorage.removeItem('daki_retro_joined');
    setHasJoined(false);
  };

  // Simulated multiplayer insertions (picks from templates)
  const addSimulatedDakiCard = async () => {
    if (!currentRetro) return;
    const items = [
      { column: 'drop', content: 'Drop Friday standup meeting. Slack check-ins are enough.', category: 'Process' },
      { column: 'add', content: 'Add automated chromatic visual regression testing.', category: 'Testing' },
      { column: 'keep', content: 'Our asynchronous review culture is working super well!', category: 'Process' },
      { column: 'improve', content: 'Webpack compiler local build speeds. Takes 8s now.', category: 'Performance' }
    ];

    const random = items[Math.floor(Math.random() * items.length)];
    const cardId = `card-sim-${Date.now()}`;
    const team = teams.find(t => t.id === selectedTeamId) || teams[0];
    const author = team.members[Math.floor(Math.random() * team.members.length)];

    await supabase.from('daki_cards').insert({
      id: cardId,
      session_id: currentRetro.id,
      column_name: random.column,
      content: random.content,
      votes: Math.floor(Math.random() * 3),
      author_id: author.id,
      author_name: author.name,
      author_emoji: author.emoji,
      category: random.category,
      is_simulated: true
    });
  };

  // Removed automatic first member selection to force manual select/add self flow

  return (
    <RetroContext.Provider value={{
      teams,
      selectedTeamId,
      currentRetro,
      history,
      previousActionItems,
      currentUserMemberId,
      setCurrentUserMemberId,
      selectTeam,
      createTeam,
      startRetro,
      nextPhase,
      prevPhase,
      setPhase,
      startGame,
      setIcebreakerQuestion,
      updateGameScore,
      setIcebreakerAnswer,
      setHealthScore,
      setAiAdoptionScore,
      addDakiCard,
      voteDakiCard,
      deleteDakiCard,
      addActionItem,
      updatePrevActionItemStatus,
      setRetroScore,
      completeRetro,
      cancelRetro,
      leaveRetro,
      addSimulatedDakiCard,
      addTeamMember,
      hasJoined,
      joinRetro,
      isUsingMockData,
      loading
    }}>
      {children}
    </RetroContext.Provider>
  );
};

export const useRetro = () => {
  const context = useContext(RetroContext);
  if (context === undefined) {
    throw new Error('useRetro must be used within a RetroProvider');
  }
  return context;
};
