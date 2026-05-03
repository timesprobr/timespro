import { Athlete, Match, Transaction, Member } from './types';

export const mockAthletes: Athlete[] = [
  {
    id: '1',
    name: 'Roberto Silva',
    full_name: 'Roberto Carlos Silva',
    birth_date: '1995-05-15',
    position: 'Zagueiro',
    number: 3,
    status: 'Ativo',
    phone: '(11) 98888-7777',
    document_cpf: '123.456.789-00',
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Juninho',
    full_name: 'Junior Alves Oliveira',
    birth_date: '1998-10-22',
    position: 'Meia',
    number: 10,
    status: 'Inativo',
    phone: '(11) 97777-6666',
    created_at: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Goleiro Vitor',
    full_name: 'Vitor Hugo Fernandes',
    birth_date: '1992-02-10',
    position: 'Goleiro',
    number: 1,
    status: 'Ativo',
    phone: '(11) 96666-5555',
    created_at: new Date().toISOString(),
  }
];

export const mockMatches: Match[] = [
  {
    id: '1',
    opponent: 'União da Vila',
    date: new Date(Date.now() + 86400000 * 2).toISOString(),
    location: 'Campo do CDC',
    type: 'Campeonato',
    status: 'Agendado',
  },
  {
    id: '2',
    opponent: 'Real Matismo',
    date: new Date(Date.now() - 86400000 * 5).toISOString(),
    location: 'Arena Varzea',
    type: 'Amistoso',
    status: 'Finalizado',
    home_score: 2,
    away_score: 1,
  }
];

export const mockTransactions: Transaction[] = [
  {
    id: '1',
    description: 'Mensalidade Abril - Integrantes',
    amount: 1500,
    type: 'Entrada',
    category: 'Mensalidade',
    date: '2026-04-10',
  },
  {
    id: '2',
    description: 'Aluguel do Campo',
    amount: 350,
    type: 'Saída',
    category: 'Aluguel Campo',
    date: '2026-04-15',
  }
];

export const mockMembers: Member[] = [
  {
    id: '1',
    name: 'Carlos Alberto',
    email: 'carlos@email.com',
    phone: '11999998888',
    plan: 'Ouro',
    payment_status: 'Em dia',
    last_payment: '2026-04-05',
  },
  {
    id: '2',
    name: 'Sérgio Ramos',
    email: 'sergio@email.com',
    phone: '11988887777',
    plan: 'Prata',
    payment_status: 'Inadimplente',
  }
];
