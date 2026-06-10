-- Add editor role between admin and member
ALTER TYPE global_role ADD VALUE IF NOT EXISTS 'editor' BEFORE 'member';
