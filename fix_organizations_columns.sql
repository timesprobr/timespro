-- Adicionar colunas de endereço e identificação na tabela organizations
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS cnpj TEXT,
ADD COLUMN IF NOT EXISTS cep TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS neighborhood TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT;

-- Garantir que as políticas de RLS permitam a inserção inicial se necessário
-- (Assumindo que a tabela já existe e tem RLS configurado)
