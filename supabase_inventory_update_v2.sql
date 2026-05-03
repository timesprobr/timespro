-- Adicionar novos campos ao almoxarifado
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS brand TEXT,
ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'Unidade',
ADD COLUMN IF NOT EXISTS observations TEXT;

-- Garantir que as políticas de RLS continuem válidas (não precisa mudar, mas é bom reforçar)
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
