CREATE TABLE public.kanban_placements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  board text NOT NULL CHECK (board IN ('people','products','organizations')),
  item_id text NOT NULL,
  column_key text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, board, item_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kanban_placements TO authenticated;
GRANT ALL ON public.kanban_placements TO service_role;

ALTER TABLE public.kanban_placements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own kanban placements"
ON public.kanban_placements FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_kanban_placements_updated_at
BEFORE UPDATE ON public.kanban_placements
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();