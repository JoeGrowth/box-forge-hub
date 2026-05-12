
-- Create ops_consultants table
CREATE TABLE public.ops_consultants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  pattern TEXT,
  skills TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ops_consultants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own consultants"
ON public.ops_consultants FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own consultants"
ON public.ops_consultants FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own consultants"
ON public.ops_consultants FOR DELETE
USING (auth.uid() = user_id);

-- Create ops_companies table
CREATE TABLE public.ops_companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  legal_form TEXT NOT NULL DEFAULT 'SUARL',
  shareholders JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ops_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own companies"
ON public.ops_companies FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own companies"
ON public.ops_companies FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own companies"
ON public.ops_companies FOR DELETE
USING (auth.uid() = user_id);

-- Create ops_clients table
CREATE TABLE public.ops_clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ops_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own clients"
ON public.ops_clients FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own clients"
ON public.ops_clients FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clients"
ON public.ops_clients FOR DELETE
USING (auth.uid() = user_id);

-- Create ops_offers table
CREATE TABLE public.ops_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID NOT NULL,
  company_id UUID NOT NULL,
  consultant_ids UUID[] DEFAULT '{}',
  description TEXT,
  price TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ops_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own offers"
ON public.ops_offers FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own offers"
ON public.ops_offers FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own offers"
ON public.ops_offers FOR DELETE
USING (auth.uid() = user_id);
