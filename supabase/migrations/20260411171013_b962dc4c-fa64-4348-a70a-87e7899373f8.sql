
-- Controlled vocabulary of skills
CREATE TABLE public.skill_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  category text NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.skill_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view skill tags"
ON public.skill_tags FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can manage skill tags"
ON public.skill_tags FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- User skill selections (max 20 enforced at app level)
CREATE TABLE public.user_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  skill_tag_id uuid NOT NULL REFERENCES public.skill_tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, skill_tag_id)
);

ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own skills"
ON public.user_skills FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can add their own skills"
ON public.user_skills FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own skills"
ON public.user_skills FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all user skills"
ON public.user_skills FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed controlled vocabulary
INSERT INTO public.skill_tags (name, category) VALUES
-- Business & Strategy
('Business Strategy', 'Business'),
('Financial Analysis', 'Business'),
('Budgeting', 'Business'),
('Market Research', 'Business'),
('Business Development', 'Business'),
('Project Management', 'Business'),
('Operations Management', 'Business'),
('Supply Chain', 'Business'),
-- Technology
('Software Development', 'Technology'),
('Web Development', 'Technology'),
('Mobile Development', 'Technology'),
('Data Analysis', 'Technology'),
('Cloud Computing', 'Technology'),
('Cybersecurity', 'Technology'),
('AI & Machine Learning', 'Technology'),
('Database Management', 'Technology'),
-- Marketing & Sales
('Digital Marketing', 'Marketing'),
('Content Creation', 'Marketing'),
('SEO & SEM', 'Marketing'),
('Sales', 'Marketing'),
('Brand Management', 'Marketing'),
('Social Media', 'Marketing'),
-- Leadership & People
('Team Leadership', 'Leadership'),
('Team Building', 'Leadership'),
('Coaching & Mentoring', 'Leadership'),
('Change Management', 'Leadership'),
('Conflict Resolution', 'Leadership'),
('Public Speaking', 'Leadership'),
-- Consulting & Professional
('Management Consulting', 'Consulting'),
('Training & Facilitation', 'Consulting'),
('Process Improvement', 'Consulting'),
('Risk Management', 'Consulting'),
('Compliance', 'Consulting'),
('Quality Assurance', 'Consulting'),
-- Design & Creative
('UX/UI Design', 'Design'),
('Graphic Design', 'Design'),
('Product Design', 'Design'),
-- Finance & Legal
('Accounting', 'Finance'),
('Investment Analysis', 'Finance'),
('Legal & Contracts', 'Finance'),
('Fundraising', 'Finance'),
-- Industry Specific
('Healthcare', 'Industry'),
('Agriculture', 'Industry'),
('Education', 'Industry'),
('Energy & Environment', 'Industry'),
('Manufacturing', 'Industry'),
('Real Estate', 'Industry'),
('Logistics', 'Industry'),
('Telecommunications', 'Industry');
