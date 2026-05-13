
-- Add client type and shareholder count to ops_clients
ALTER TABLE public.ops_clients 
ADD COLUMN client_type TEXT,
ADD COLUMN shareholder_count INTEGER;

-- Add index on client_type for filtering
CREATE INDEX idx_ops_clients_type ON public.ops_clients(client_type);
