-- Atualizando a tabela de eventos com novos campos
ALTER TABLE club_events ADD COLUMN IF NOT EXISTS cep TEXT;
ALTER TABLE club_events ADD COLUMN IF NOT EXISTS notes TEXT;

-- Garantindo que a tabela de categorias tenha uma cor padrão
ALTER TABLE event_categories ALTER COLUMN color SET DEFAULT '#CCFF00';
