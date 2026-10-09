-- Instagram Collab support: invite co-authors so a post also appears on their
-- profile (and their followers' feeds). Stored as a comma-separated list of
-- handles (max 3), applied by publish-instagram for feed posts only — Stories
-- don't support collaborators.
--
-- Nullable / additive, so it is safe to apply at any time. Until it is applied,
-- publish-instagram falls back to reading the batch without this column.

ALTER TABLE public.ig_slide_batches
  ADD COLUMN IF NOT EXISTS collaborators TEXT;
