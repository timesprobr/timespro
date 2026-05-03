export type Position = 'Goleiro' | 'Zagueiro' | 'Lateral' | 'Volante' | 'Meia' | 'Atacante';

export type AthleteStatus = 'Ativo' | 'Inativo' | 'Lesionado' | 'Suspenso';

export interface Athlete {
  id: string;
  name: string;
  full_name: string;
  birth_date: string;
  position: Position;
  number?: number;
  status: AthleteStatus;
  photo_url?: string;
  phone?: string;
  document_rg?: string;
  document_cpf?: string;
  medical_restrictions?: string;
  history?: string;
  created_at: string;
}

export interface Staff {
  id: string;
  name: string;
  role: 'Técnico' | 'Auxiliar' | 'Preparador Físico' | 'Fisioterapeuta' | 'Diretoria' | 'Voluntário';
  phone?: string;
  email?: string;
}

export interface Match {
  id: string;
  opponent: string;
  date: string;
  location: string;
  type: 'Amistoso' | 'Campeonato' | 'Treino';
  status: 'Agendado' | 'Em Andamento' | 'Finalizado' | 'Cancelado';
  home_score?: number;
  away_score?: number;
  stats?: any;
  lineup?: string[]; // IDs of athletes
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'Entrada' | 'Saída';
  category: 'Mensalidade' | 'Patrocínio' | 'Uniforme' | 'Aluguel Campo' | 'Outros';
  date: string;
  receipt_url?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  total_quantity: number;
  available_quantity: number;
  category: 'Uniforme' | 'Bola' | 'Equipamento' | 'Médico';
}

export interface InventoryMovement {
  id: string;
  item_id: string;
  athlete_id?: string;
  staff_id?: string;
  quantity: number;
  type: 'Retirada' | 'Devolução';
  date: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  plan: 'Bronze' | 'Prata' | 'Ouro';
  payment_status: 'Em dia' | 'Inadimplente';
  last_payment?: string;
}

export interface Sponsor {
  id: string;
  name: string;
  logo_url: string;
  contribution_value: number;
  contract_end: string;
  placement: 'Camisa' | 'Site' | 'Banner' | 'Redes Sociais';
}

export interface Crowdfunding {
  id: string;
  title: string;
  description: string;
  goal: number;
  current: number;
  end_date: string;
}
