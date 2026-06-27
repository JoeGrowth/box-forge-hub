
ALTER TABLE public.boxes
  ADD COLUMN IF NOT EXISTS data_mode text NOT NULL DEFAULT 'demo'
  CHECK (data_mode IN ('demo','live'));

-- Allow Box Admins (assigned in box_ecosystem_admins) and platform admins to update their box
DROP POLICY IF EXISTS "Box admins can update their box" ON public.boxes;
CREATE POLICY "Box admins can update their box"
ON public.boxes
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.box_ecosystem_admins a
    WHERE a.box_id = boxes.id AND a.user_id = auth.uid()
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.box_ecosystem_admins a
    WHERE a.box_id = boxes.id AND a.user_id = auth.uid()
  )
);

GRANT UPDATE ON public.boxes TO authenticated;
