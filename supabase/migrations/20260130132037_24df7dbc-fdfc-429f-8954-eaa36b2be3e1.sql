
-- Create table for Natural Role Decoder test submissions
CREATE TABLE public.nr_decoder_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, reviewed, completed
  answers JSONB NOT NULL DEFAULT '{}',
  admin_notes TEXT,
  result_pdf_url TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.nr_decoder_submissions ENABLE ROW LEVEL SECURITY;

-- Users can view and manage their own submissions
CREATE POLICY "Users can view their own submissions"
  ON public.nr_decoder_submissions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own submissions"
  ON public.nr_decoder_submissions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own submissions"
  ON public.nr_decoder_submissions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can view all submissions
CREATE POLICY "Admins can view all submissions"
  ON public.nr_decoder_submissions
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update any submission
CREATE POLICY "Admins can update any submission"
  ON public.nr_decoder_submissions
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_nr_decoder_submissions_updated_at
  BEFORE UPDATE ON public.nr_decoder_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for submissions
ALTER PUBLICATION supabase_realtime ADD TABLE public.nr_decoder_submissions;
