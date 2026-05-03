-- SCHEMA FINANCEIRO E DE MENSALIDADES - TIMESPRO
-- Este script configura o sistema de mensalidades, planos e assinaturas de atletas.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS athlete_modalities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(organization_id, name)
);

CREATE TABLE IF NOT EXISTS athlete_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL,
  modality_id UUID REFERENCES athlete_modalities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(organization_id, modality_id, name)
);

CREATE TABLE IF NOT EXISTS memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL,
  name TEXT NOT NULL, 
  description TEXT,
  modality_id UUID REFERENCES athlete_modalities(id) ON DELETE SET NULL,
  category_id UUID REFERENCES athlete_categories(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE memberships ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS modality_id UUID REFERENCES athlete_modalities(id) ON DELETE SET NULL;
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES athlete_categories(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS membership_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL,
  membership_id UUID NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  billing_period TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS athlete_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL,
  athlete_id UUID NOT NULL,
  plan_id UUID NOT NULL REFERENCES membership_plans(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active',
  payer_type TEXT DEFAULT 'athlete',
  payer_name TEXT,
  payer_email TEXT,
  payer_phone TEXT,
  due_day INTEGER DEFAULT 10,
  starts_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  ends_at TIMESTAMP WITH TIME ZONE,
  next_billing_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE athlete_subscriptions DROP CONSTRAINT IF EXISTS athlete_subscriptions_athlete_id_plan_id_key;
ALTER TABLE athlete_subscriptions DROP CONSTRAINT IF EXISTS athlete_subscriptions_athlete_id_key;
ALTER TABLE athlete_subscriptions ADD CONSTRAINT athlete_subscriptions_athlete_id_key UNIQUE (athlete_id);

CREATE TABLE IF NOT EXISTS subscription_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL,
  subscription_id UUID NOT NULL REFERENCES athlete_subscriptions(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE,
  payment_method TEXT,
  status TEXT DEFAULT 'pending',
  external_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Garantir colunas na tabela athlete_subscriptions
ALTER TABLE athlete_subscriptions ADD COLUMN IF NOT EXISTS payer_type TEXT DEFAULT 'athlete';
ALTER TABLE athlete_subscriptions ADD COLUMN IF NOT EXISTS payer_name TEXT;
ALTER TABLE athlete_subscriptions ADD COLUMN IF NOT EXISTS payer_email TEXT;
ALTER TABLE athlete_subscriptions ADD COLUMN IF NOT EXISTS payer_phone TEXT;
ALTER TABLE athlete_subscriptions ADD COLUMN IF NOT EXISTS due_day INTEGER DEFAULT 10;
ALTER TABLE athlete_subscriptions ADD COLUMN IF NOT EXISTS starts_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
ALTER TABLE athlete_subscriptions ADD COLUMN IF NOT EXISTS ends_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE athlete_subscriptions ADD COLUMN IF NOT EXISTS next_billing_at TIMESTAMP WITH TIME ZONE;
