-- Add ownership metadata to teams and approval lifecycle to team members.
ALTER TABLE public.teams
ADD COLUMN IF NOT EXISTS owner_member_id text;

ALTER TABLE public.team_members
ADD COLUMN IF NOT EXISTS status text DEFAULT 'approved',
ADD COLUMN IF NOT EXISTS created_by_member_id text,
ADD COLUMN IF NOT EXISTS approved_by_member_id text,
ADD COLUMN IF NOT EXISTS approved_at timestamptz;

UPDATE public.team_members
SET status = 'approved'
WHERE status IS NULL;

ALTER TABLE public.team_members
DROP CONSTRAINT IF EXISTS team_members_status_check;

ALTER TABLE public.team_members
ADD CONSTRAINT team_members_status_check
CHECK (status IN ('pending', 'approved', 'rejected'));

CREATE INDEX IF NOT EXISTS idx_team_members_team_status
ON public.team_members (team_id, status);
