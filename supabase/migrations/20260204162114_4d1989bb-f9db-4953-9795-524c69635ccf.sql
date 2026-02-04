-- Add episode tracking to startup_ideas table
-- Episode 1 = 'development' (Ideation, Structuring, Role Definition, Team Building, Launch)
-- Episode 2 = 'validation' (Validation, Execution & Operations, Iteration & Improvement)
-- Episode 3 = 'growth' (Customer Acquisition, Partnerships, Revenue Growth, Team Scaling)

ALTER TABLE public.startup_ideas 
ADD COLUMN IF NOT EXISTS current_episode text NOT NULL DEFAULT 'development' 
CHECK (current_episode IN ('development', 'validation', 'growth', 'completed'));

ALTER TABLE public.startup_ideas 
ADD COLUMN IF NOT EXISTS development_completed_at timestamptz;

ALTER TABLE public.startup_ideas 
ADD COLUMN IF NOT EXISTS validation_completed_at timestamptz;

ALTER TABLE public.startup_ideas 
ADD COLUMN IF NOT EXISTS growth_completed_at timestamptz;

-- Add episode field to idea_journey_progress to differentiate episodes
ALTER TABLE public.idea_journey_progress 
ADD COLUMN IF NOT EXISTS episode text NOT NULL DEFAULT 'development' 
CHECK (episode IN ('development', 'validation', 'growth'));