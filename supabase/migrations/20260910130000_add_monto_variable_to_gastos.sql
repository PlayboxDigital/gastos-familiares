ALTER TABLE public.gastos
ADD COLUMN IF NOT EXISTS monto_variable boolean NOT NULL DEFAULT false;
