-- Script para adicionar coluna de visibilidade na tabela de eventos
ALTER TABLE club_events ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'internal' CHECK (visibility IN ('internal', 'public'));
