-- Tabela para Bilheteria / Ingressos de Jogos
CREATE TABLE IF NOT EXISTS game_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    opponent TEXT NOT NULL,
    location TEXT NOT NULL,
    game_date TIMESTAMPTZ,
    base_price DECIMAL(10,2) NOT NULL,
    fan_price_type TEXT CHECK (fan_price_type IN ('fixed', 'percent')),
    fan_price_value DECIMAL(10,2),
    has_transport BOOLEAN DEFAULT false,
    transport_check_in_time TEXT,
    transport_check_in_location TEXT,
    transport_check_out_time TEXT,
    transport_check_out_location TEXT,
    transport_vacancies INTEGER,
    extra_services TEXT[] DEFAULT '{}',
    banner_url TEXT,
    opponent_crest_url TEXT,
    stadium_name TEXT,
    total_inventory INTEGER DEFAULT 100,
    transport_price DECIMAL(10,2) DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'sold_out')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela para Vendas/Compras de Ingressos
CREATE TABLE IF NOT EXISTS ticket_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES game_tickets(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    buyer_name TEXT NOT NULL,
    buyer_document TEXT NOT NULL, -- CPF/RG
    buyer_email TEXT,
    is_fan_member BOOLEAN DEFAULT false,
    wants_transport BOOLEAN DEFAULT false,
    paid_amount DECIMAL(10,2) NOT NULL,
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'cancelled')),
    payment_method TEXT CHECK (payment_method IN ('pix', 'credit_card')),
    qr_code_token TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS para compras
ALTER TABLE ticket_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view purchases of their organization" ON ticket_purchases;
CREATE POLICY "Users can view purchases of their organization"
    ON ticket_purchases FOR SELECT
    USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Habilitar RLS
ALTER TABLE game_tickets ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
DROP POLICY IF EXISTS "Users can view game tickets of their organization" ON game_tickets;
CREATE POLICY "Users can view game tickets of their organization"
    ON game_tickets FOR SELECT
    USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage game tickets" ON game_tickets;
CREATE POLICY "Admins can manage game tickets"
    ON game_tickets FOR ALL
    USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Permitir visualização pública para a página de compra
DROP POLICY IF EXISTS "Public can view active game tickets" ON game_tickets;
CREATE POLICY "Public can view active game tickets"
    ON game_tickets FOR SELECT
    USING (status = 'active');

-- Trigger para updated_at
DROP TRIGGER IF EXISTS set_game_tickets_updated_at ON game_tickets;
CREATE TRIGGER set_game_tickets_updated_at
    BEFORE UPDATE ON game_tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comandos para garantir que as colunas existam (caso a tabela já exista)
ALTER TABLE game_tickets ADD COLUMN IF NOT EXISTS stadium_name TEXT;
ALTER TABLE game_tickets ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE game_tickets ADD COLUMN IF NOT EXISTS opponent_crest_url TEXT;
ALTER TABLE game_tickets ADD COLUMN IF NOT EXISTS extra_services TEXT[] DEFAULT '{}';
ALTER TABLE game_tickets ADD COLUMN IF NOT EXISTS total_inventory INTEGER DEFAULT 100;

ALTER TABLE ticket_purchases ADD COLUMN IF NOT EXISTS wants_transport BOOLEAN DEFAULT false;
ALTER TABLE game_tickets ADD COLUMN IF NOT EXISTS transport_price DECIMAL(10,2) DEFAULT 0;

