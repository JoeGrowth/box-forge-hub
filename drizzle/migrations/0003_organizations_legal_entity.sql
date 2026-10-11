ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS legal_status TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS legal_entity_name TEXT,
  ADD COLUMN IF NOT EXISTS legal_entity_details TEXT;

COMMENT ON COLUMN public.organizations.legal_status IS 'none = no legal entity yet; billed_via = activity billed through another legal person/business; registered = organization is itself a registered company';
COMMENT ON COLUMN public.organizations.legal_entity_name IS 'Name of the legal person or business issuing invoices (e.g. Houssem Kaabi — patente physique, Angry Penguin), or the registered company name';
COMMENT ON COLUMN public.organizations.legal_entity_details IS 'Free-text details: registration number, patente reference, associates legally established vs platform-configured allocations, etc.';