/* eslint-disable react-refresh/only-export-components */
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
  setStarOfReleaseVote: (memberId: string, nomineeId: string) => Promise<void>;
  addDakiCard: (column: 'drop' | 'add' | 'keep' | 'improve', content: string, authorId: string, category?: string) => Promise<void>;
  voteDakiCard: (cardId: string, memberId: string) => Promise<void>;
  deleteDakiCard: (cardId: string) => Promise<void>;
  addActionItem: (description: string, assigneeId: string, dueDate: string) => Promise<void>;
  updatePrevActionItemStatus: (itemId: string, status: ActionItem['status'], progressComment?: string) => Promise<void>;
  submitRetroFeedback: (memberId: string, feedback: string) => Promise<void>;
  setRetroScore: (score: number, feedback: string) => Promise<void>;
  completeRetro: () => Promise<{ ok: boolean; missingMemberIds: string[] }>;
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

type DbCardRow = {
  id: string;
  column_name: string;
  content: string;
  votes: number;
  author_id: string;
  author_name: string;
  author_emoji: string;
  category?: string;
  is_simulated?: boolean;
  voted_by?: string[];
};

type DbActionRow = {
  id: string;
  description: string;
  assignee_id: string;
  due_date: string;
  status: ActionItem['status'];
  created_in_retro: string;
  progress_comment?: string;
};

// Map database card structure to client structure
const mapCardFromDb = (dbCard: DbCardRow): DakiCard => ({
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

const ACTION_COMMENTS_STORAGE_PREFIX = 'daki_retro_action_comments_';

const getActionCommentsStorageKey = (teamId: string): string => `${ACTION_COMMENTS_STORAGE_PREFIX}${teamId}`;

const loadLocalActionComments = (teamId: string): Record<string, string> => {
  if (!teamId) return {};

  try {
    const saved = localStorage.getItem(getActionCommentsStorageKey(teamId));
    if (!saved) return {};
    const parsed = JSON.parse(saved);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    console.warn('[RetroHub] Failed to parse local action comments.', error);
    return {};
  }
};

const saveLocalActionComment = (teamId: string, itemId: string, comment: string) => {
  if (!teamId || !itemId) return;

  const existing = loadLocalActionComments(teamId);
  const trimmedComment = comment.trim();

  if (trimmedComment) {
    existing[itemId] = trimmedComment;
  } else {
    delete existing[itemId];
  }

  localStorage.setItem(getActionCommentsStorageKey(teamId), JSON.stringify(existing));
};

const mapActionItemFromDb = (dbAction: DbActionRow, localComments: Record<string, string> = {}): ActionItem => {
  const commentFromDb = typeof dbAction.progress_comment === 'string' ? dbAction.progress_comment.trim() : '';
  return {
    id: dbAction.id,
    description: dbAction.description,
    assigneeId: dbAction.assignee_id,
    dueDate: dbAction.due_date,
    status: dbAction.status,
    createdInRetro: dbAction.created_in_retro,
    progressComment: commentFromDb || localComments[dbAction.id] || ''
  };
};

type RetroFeedbackPayload = {
  facilitatorFeedback: string;
  memberFeedback: Record<string, string>;
  joinedMemberIds: string[];
};

const getDefaultRetroFeedbackPayload = (): RetroFeedbackPayload => ({
  facilitatorFeedback: '',
  memberFeedback: {},
  joinedMemberIds: []
});

const normalizeJoinedMemberIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  const uniqueIds = new Set<string>();
  value.forEach(entry => {
    if (typeof entry === 'string' && entry.trim()) {
      uniqueIds.add(entry.trim());
    }
  });

  return Array.from(uniqueIds);
};

const normalizeMemberFeedback = (value: unknown): Record<string, string> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>((acc, [memberId, feedback]) => {
    if (typeof feedback === 'string' && feedback.trim()) {
      acc[memberId] = feedback.trim();
    }
    return acc;
  }, {});
};

const parseRetroFeedback = (rawFeedback: unknown): RetroFeedbackPayload => {
  if (!rawFeedback) return getDefaultRetroFeedbackPayload();

  if (typeof rawFeedback === 'object') {
    const parsedObject = rawFeedback as Record<string, unknown>;
    return {
      facilitatorFeedback: typeof parsedObject.facilitatorFeedback === 'string' ? parsedObject.facilitatorFeedback : '',
      memberFeedback: normalizeMemberFeedback(parsedObject.memberFeedback),
      joinedMemberIds: normalizeJoinedMemberIds(parsedObject.joinedMemberIds)
    };
  }

  if (typeof rawFeedback !== 'string') return getDefaultRetroFeedbackPayload();

  const trimmed = rawFeedback.trim();
  if (!trimmed) return getDefaultRetroFeedbackPayload();

  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    if (parsed && typeof parsed === 'object') {
      return {
        facilitatorFeedback: typeof parsed.facilitatorFeedback === 'string' ? parsed.facilitatorFeedback : '',
        memberFeedback: normalizeMemberFeedback(parsed.memberFeedback),
        joinedMemberIds: normalizeJoinedMemberIds(parsed.joinedMemberIds)
      };
    }
  } catch {
    // Backward compatibility: legacy sessions store facilitator feedback as plain text.
  }

  return {
    facilitatorFeedback: trimmed,
    memberFeedback: {},
    joinedMemberIds: []
  };
};

const serializeRetroFeedback = (payload: RetroFeedbackPayload): string => {
  return JSON.stringify({
    facilitatorFeedback: payload.facilitatorFeedback,
    memberFeedback: payload.memberFeedback,
    joinedMemberIds: payload.joinedMemberIds
  });
};

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
            dbTeams.map(async (t) => {
              const { data: m, error: memError } = await supabase.from('team_members').select('*').eq('team_id', t.id);
              if (memError) {
                console.error('[RetroHub] Error fetching members for team', t.name, memError);
              }
              return {
                id: t.id,
                name: t.name,
                members: (m || []).map((member) => ({
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
          dbSessions.map(async (s) => {
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

            const parsedFeedback = parseRetroFeedback(s.retro_feedback);

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
              actionItems: (actions || []).map((a) => mapActionItemFromDb(a)),
              retroScore: s.retro_score,
              retroFeedback: parsedFeedback.facilitatorFeedback,
              memberRetroFeedback: parsedFeedback.memberFeedback,
              joinedMemberIds: parsedFeedback.joinedMemberIds
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
        async (payload) => {
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
        (payload) => {
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
      const localActionComments = loadLocalActionComments(selectedTeamId);

      // Load previous unresolved actions
      const { data: prevActions } = await supabase
        .from('action_items')
        .select('*')
        .eq('team_id', selectedTeamId)
        .neq('status', 'Resolved');

      if (prevActions) {
        setPreviousActionItems(prevActions.map((a) => mapActionItemFromDb(a, localActionComments)));
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
        const parsedFeedback = parseRetroFeedback(s.retro_feedback);
        
        // Fetch session components
        const { data: cards } = await supabase.from('daki_cards').select('*').eq('session_id', s.id);
        const { data: actions } = await supabase.from('action_items').select('*').eq('session_id', s.id);
        const { data: games } = await supabase.from('game_scores').select('*').eq('session_id', s.id);
        const { data: ice } = await supabase.from('icebreaker_answers').select('*').eq('session_id', s.id);
        const { data: health } = await supabase.from('health_check_scores').select('*').eq('session_id', s.id);
        const { data: aiScores } = await supabase.from('ai_adoption_scores').select('*').eq('session_id', s.id);
        const { data: starVotes } = await supabase.from('star_of_release_votes').select('*').eq('session_id', s.id);

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

        const starOfReleaseVotes: Record<string, string> = {};
        starVotes?.forEach(v => { starOfReleaseVotes[v.voted_by_member_id] = v.nominee_member_id; });

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
          actionItems: (actions || []).map((a) => mapActionItemFromDb(a, localActionComments)),
          retroScore: s.retro_score,
          retroFeedback: parsedFeedback.facilitatorFeedback,
          memberRetroFeedback: parsedFeedback.memberFeedback,
          joinedMemberIds: parsedFeedback.joinedMemberIds,
          gameStatus: s.game_status,
          gameStartedAt: s.game_started_at,
          icebreakerQuestion: s.icebreaker_question,
          createdBy: s.created_by,
          starOfReleaseVotes
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
        queueMicrotask(() => setCurrentUserMemberId(''));
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
        async (payload) => {
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
              const parsedFeedback = parseRetroFeedback(s.retro_feedback);
              // Fetch details
              const { data: cards } = await supabase.from('daki_cards').select('*').eq('session_id', s.id);
              const { data: actions } = await supabase.from('action_items').select('*').eq('session_id', s.id);
              const { data: games } = await supabase.from('game_scores').select('*').eq('session_id', s.id);
              const { data: ice } = await supabase.from('icebreaker_answers').select('*').eq('session_id', s.id);
              const { data: health } = await supabase.from('health_check_scores').select('*').eq('session_id', s.id);
              const { data: aiScores } = await supabase.from('ai_adoption_scores').select('*').eq('session_id', s.id);
              const { data: starVotesInsert } = await supabase.from('star_of_release_votes').select('*').eq('session_id', s.id);

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

              const starOfReleaseVotesInsert: Record<string, string> = {};
              starVotesInsert?.forEach(v => { starOfReleaseVotesInsert[v.voted_by_member_id] = v.nominee_member_id; });

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
                actionItems: (actions || []).map((a) => mapActionItemFromDb(a, loadLocalActionComments(s.team_id))),
                retroScore: s.retro_score,
                retroFeedback: parsedFeedback.facilitatorFeedback,
                memberRetroFeedback: parsedFeedback.memberFeedback,
                joinedMemberIds: parsedFeedback.joinedMemberIds,
                gameStatus: s.game_status,
                gameStartedAt: s.game_started_at,
                icebreakerQuestion: s.icebreaker_question,
                createdBy: s.created_by,
                starOfReleaseVotes: starOfReleaseVotesInsert
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
              const parsedFeedback = parseRetroFeedback(s.retro_feedback);
              console.log('[RetroHub] Session phase updated to:', s.phase);
              setCurrentRetro(prev => {
                if (prev && prev.id === s.id) {
                  return {
                    ...prev,
                    phase: s.phase,
                    retroScore: s.retro_score,
                    retroFeedback: parsedFeedback.facilitatorFeedback,
                    memberRetroFeedback: parsedFeedback.memberFeedback,
                    joinedMemberIds: parsedFeedback.joinedMemberIds,
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
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newCard = mapCardFromDb(payload.new as DbCardRow);
            setCurrentRetro(prev => {
              if (!prev) return null;
              if (prev.dakiCards.some(c => c.id === newCard.id)) return prev;
              return { ...prev, dakiCards: [...prev.dakiCards, newCard] };
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedCard = mapCardFromDb(payload.new as DbCardRow);
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
        (payload) => {
          const scoreRow = payload.new as { member_id?: string; score?: number };
          if (!scoreRow.member_id || typeof scoreRow.score !== 'number') return;
          const memberId = scoreRow.member_id;
          const score = scoreRow.score;
          setCurrentRetro(prev => {
            if (!prev) return null;
            return {
              ...prev,
              gameScores: { ...prev.gameScores, [memberId]: score }
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
        (payload) => {
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
        (payload) => {
          const row = payload.new as { member_id?: string; metric_id?: string; score?: number };
          if (!row.member_id || !row.metric_id || typeof row.score !== 'number') return;
          const memberId = row.member_id;
          const metricId = row.metric_id;
          const metricScore = row.score;
          setCurrentRetro(prev => {
            if (!prev) return null;
            const updatedScores = { ...prev.healthCheckScores };
            if (!updatedScores[memberId]) {
              updatedScores[memberId] = {};
            }
            updatedScores[memberId] = {
              ...updatedScores[memberId],
              [metricId]: Number(metricScore)
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
        (payload) => {
          const row = payload.new as { member_id?: string; question_id?: string; score?: number };
          if (!row.member_id || !row.question_id || typeof row.score !== 'number') return;
          const memberId = row.member_id;
          const questionId = row.question_id;
          const questionScore = row.score;
          setCurrentRetro(prev => {
            if (!prev) return null;
            const updatedScores = { ...prev.aiAdoptionScores };
            if (!updatedScores[memberId]) {
              updatedScores[memberId] = {};
            }
            updatedScores[memberId] = {
              ...updatedScores[memberId],
              [questionId]: Number(questionScore)
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
        (payload) => {
          const item = payload.new as (DbActionRow & { session_id?: string }) | null;
          if (payload.eventType === 'INSERT' && item?.session_id === sessionId) {
            setCurrentRetro(prev => {
              if (!prev) return null;
              if (prev.actionItems.some(i => i.id === item.id)) return prev;
              return {
                ...prev,
                actionItems: [...prev.actionItems, mapActionItemFromDb(item, loadLocalActionComments(prev.teamId))]
              };
            });
          } else if (payload.eventType === 'UPDATE' && item?.session_id === sessionId) {
            setCurrentRetro(prev => {
              if (!prev) return null;
              return {
                ...prev,
                actionItems: prev.actionItems.map((existingItem) => (
                  existingItem.id === item.id
                    ? mapActionItemFromDb(item, loadLocalActionComments(prev.teamId))
                    : existingItem
                ))
              };
            });
          } else if (payload.eventType === 'DELETE' && payload.old?.session_id === sessionId) {
            const deletedItemId = payload.old.id;
            setCurrentRetro(prev => {
              if (!prev) return null;
              return {
                ...prev,
                actionItems: prev.actionItems.filter(existingItem => existingItem.id !== deletedItemId)
              };
            });
          }
        }
      )
      .subscribe();

    // Listen to star of release votes
    const starVotesChannel = supabase
      .channel(`star_votes_${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'star_of_release_votes', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          const row = payload.new as { voted_by_member_id?: string; nominee_member_id?: string };
          if (!row.voted_by_member_id || !row.nominee_member_id) return;
          const votedByMemberId = row.voted_by_member_id;
          const nomineeMemberId = row.nominee_member_id;
          setCurrentRetro(prev => {
            if (!prev) return null;
            return {
              ...prev,
              starOfReleaseVotes: {
                ...(prev.starOfReleaseVotes || {}),
                [votedByMemberId]: nomineeMemberId
              }
            };
          });
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
      supabase.removeChannel(starVotesChannel);
    };
  }, [currentRetro]);

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
    const initialJoinedMemberIds = currentUserMemberId ? [currentUserMemberId] : [];
    const initialFeedbackPayload = serializeRetroFeedback({
      facilitatorFeedback: '',
      memberFeedback: {},
      joinedMemberIds: initialJoinedMemberIds
    });

    const { error } = await supabase.from('retro_sessions').insert({
      id: retroId,
      team_id: team.id,
      date: dateStr,
      phase: 1,
      status: 'active',
      icebreaker_question: initialQuestion,
      created_by: currentUserMemberId,
      retro_feedback: initialFeedbackPayload
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
        memberRetroFeedback: {},
        joinedMemberIds: initialJoinedMemberIds,
        gameStatus: 'not_started',
        icebreakerQuestion: initialQuestion,
        createdBy: currentUserMemberId,
        starOfReleaseVotes: {}
      });
    }
  };

  const joinRetro = () => {
    if (currentRetro) {
      sessionStorage.setItem('daki_retro_joined', 'true');
      setHasJoined(true);

      if (!currentUserMemberId) return;

      const nextJoinedMemberIds = Array.from(new Set([...(currentRetro.joinedMemberIds || []), currentUserMemberId]));
      const payload: RetroFeedbackPayload = {
        facilitatorFeedback: currentRetro.retroFeedback || '',
        memberFeedback: currentRetro.memberRetroFeedback || {},
        joinedMemberIds: nextJoinedMemberIds
      };

      void supabase
        .from('retro_sessions')
        .update({ retro_feedback: serializeRetroFeedback(payload) })
        .eq('id', currentRetro.id);

      setCurrentRetro(prev => {
        if (!prev) return null;
        return {
          ...prev,
          joinedMemberIds: nextJoinedMemberIds
        };
      });
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
    }, { onConflict: 'id' });
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
    }, { onConflict: 'id' });
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
  const updatePrevActionItemStatus = async (
    itemId: string,
    status: ActionItem['status'],
    progressComment?: string
  ) => {
    const hasCommentUpdate = typeof progressComment === 'string';
    const trimmedComment = hasCommentUpdate ? progressComment.trim() : undefined;
    const updatePayload: Record<string, unknown> = { status };

    if (hasCommentUpdate) {
      updatePayload.progress_comment = trimmedComment;
    }

    const { error } = await supabase.from('action_items').update(updatePayload).eq('id', itemId);

    if (hasCommentUpdate && selectedTeamId) {
      saveLocalActionComment(selectedTeamId, itemId, trimmedComment || '');
    }

    if (error && !hasCommentUpdate) {
      console.error('[RetroHub] Failed to update action item status.', error);
      return;
    }

    if (error && hasCommentUpdate) {
      const missingCommentColumn = error.message?.toLowerCase().includes('progress_comment');
      if (!missingCommentColumn) {
        console.error('[RetroHub] Failed to update action item comment.', error);
        return;
      }
      console.warn('[RetroHub] progress_comment column missing in Supabase. Using local fallback storage.');
    }

    // Update local state for immediate feedback
    setPreviousActionItems(prev => prev.map(i => {
      if (i.id !== itemId) return i;
      return {
        ...i,
        status,
        ...(hasCommentUpdate ? { progressComment: trimmedComment || '' } : {})
      };
    }));

    setCurrentRetro(prev => {
      if (!prev) return null;
      return {
        ...prev,
        actionItems: prev.actionItems.map(i => {
          if (i.id !== itemId) return i;
          return {
            ...i,
            status,
            ...(hasCommentUpdate ? { progressComment: trimmedComment || '' } : {})
          };
        })
      };
    });
  };

  // Cast / update vote for Star of Release (one vote per member per session)
  const setStarOfReleaseVote = async (memberId: string, nomineeId: string) => {
    if (!currentRetro) return;
    await supabase.from('star_of_release_votes').upsert({
      session_id: currentRetro.id,
      voted_by_member_id: memberId,
      nominee_member_id: nomineeId
    }, { onConflict: 'session_id,voted_by_member_id' });
  };

  // Final retro score feedback details
  const submitRetroFeedback = async (memberId: string, feedback: string) => {
    if (!currentRetro || !memberId) return;

    const normalizedFeedback = feedback.trim();
    if (!normalizedFeedback) return;

    const { data: sessionRow } = await supabase
      .from('retro_sessions')
      .select('retro_feedback')
      .eq('id', currentRetro.id)
      .maybeSingle();

    const parsedFeedback = parseRetroFeedback(sessionRow?.retro_feedback);
    const payload: RetroFeedbackPayload = {
      facilitatorFeedback: parsedFeedback.facilitatorFeedback,
      memberFeedback: {
        ...parsedFeedback.memberFeedback,
        [memberId]: normalizedFeedback
      },
      joinedMemberIds: Array.from(new Set([...(parsedFeedback.joinedMemberIds || []), memberId]))
    };

    await supabase
      .from('retro_sessions')
      .update({ retro_feedback: serializeRetroFeedback(payload) })
      .eq('id', currentRetro.id);

    setCurrentRetro(prev => {
      if (!prev) return null;
      return {
        ...prev,
        memberRetroFeedback: {
          ...prev.memberRetroFeedback,
          [memberId]: normalizedFeedback
        },
        joinedMemberIds: Array.from(new Set([...(prev.joinedMemberIds || []), memberId]))
      };
    });
  };

  const setRetroScore = async (score: number, feedback: string) => {
    if (!currentRetro) return;
    const payload: RetroFeedbackPayload = {
      facilitatorFeedback: feedback.trim(),
      memberFeedback: currentRetro.memberRetroFeedback || {},
      joinedMemberIds: currentRetro.joinedMemberIds || []
    };

    await supabase.from('retro_sessions').update({
      retro_score: score,
      retro_feedback: serializeRetroFeedback(payload)
    }).eq('id', currentRetro.id);

    setCurrentRetro(prev => {
      if (!prev) return null;
      return {
        ...prev,
        retroScore: score,
        retroFeedback: payload.facilitatorFeedback
      };
    });
  };

  // Complete retro and close session status
  const completeRetro = async () => {
    if (!currentRetro) return { ok: false, missingMemberIds: [] };

    const retroTeam = teams.find(t => t.id === currentRetro.teamId);
    if (!retroTeam) return { ok: false, missingMemberIds: [] };

    const feedbackMap = currentRetro.memberRetroFeedback || {};
    const validTeamMemberIds = new Set(retroTeam.members.map(member => member.id));
    const joinedIdsFromSession = (currentRetro.joinedMemberIds || []).filter(memberId => validTeamMemberIds.has(memberId));
    const fallbackJoinedIds = [
      ...(currentRetro.createdBy && validTeamMemberIds.has(currentRetro.createdBy) ? [currentRetro.createdBy] : []),
      ...(currentUserMemberId && validTeamMemberIds.has(currentUserMemberId) ? [currentUserMemberId] : []),
      ...Object.keys(feedbackMap).filter(memberId => validTeamMemberIds.has(memberId))
    ];

    const effectiveJoinedMemberIds = Array.from(
      new Set(joinedIdsFromSession.length > 0 ? joinedIdsFromSession : fallbackJoinedIds)
    );

    const missingMemberIds = effectiveJoinedMemberIds.filter(memberId => !feedbackMap[memberId]?.trim());

    if (missingMemberIds.length > 0) {
      return { ok: false, missingMemberIds };
    }

    await supabase.from('retro_sessions').update({ status: 'completed' }).eq('id', currentRetro.id);
    sessionStorage.removeItem('daki_retro_joined');
    setHasJoined(false);
    return { ok: true, missingMemberIds: [] };
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
      setStarOfReleaseVote,
      addDakiCard,
      voteDakiCard,
      deleteDakiCard,
      addActionItem,
      updatePrevActionItemStatus,
      submitRetroFeedback,
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
