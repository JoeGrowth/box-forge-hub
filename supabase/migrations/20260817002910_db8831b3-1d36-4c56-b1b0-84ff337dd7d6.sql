ALTER TABLE public.organization_people
  ADD COLUMN email TEXT,
  ADD COLUMN phone TEXT,
  ADD COLUMN age INTEGER,
  ADD COLUMN events_participated TEXT;

COMMENT ON COLUMN public.organization_people.email IS 'Friend contact email';
COMMENT ON COLUMN public.organization_people.phone IS 'Friend contact phone';
COMMENT ON COLUMN public.organization_people.age IS 'Friend age';
COMMENT ON COLUMN public.organization_people.events_participated IS 'Events the friend participated in';
