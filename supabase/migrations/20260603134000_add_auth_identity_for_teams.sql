-- Add Supabase Auth identity linkage for team ownership and membership approval actions.
ALTER TABLE public.teams
ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.team_members
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS created_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS approved_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_teams_owner_user_id
ON public.teams (owner_user_id);

CREATE INDEX IF NOT EXISTS idx_team_members_user_id
ON public.team_members (user_id);
