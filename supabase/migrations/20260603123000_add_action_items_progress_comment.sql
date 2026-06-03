-- Add optional progress comments to action items for cross-client sync.
ALTER TABLE public.action_items
ADD COLUMN IF NOT EXISTS progress_comment text;
