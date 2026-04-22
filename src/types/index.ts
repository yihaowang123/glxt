export interface User {
  id: string;
  username: string;
  password?: string;
  created_at: string;
  updated_at: string;
}

export interface WageSettings {
  id: string;
  block_price: number;
  package_price: number;
  created_at: string;
  updated_at: string;
}

export interface Worker {
  id: string;
  name: string;
  phone?: string;
  age?: number;
  job_type?: string;
  created_at: string;
  updated_at: string;
  total_blocks?: number;
  total_packages?: number;
  total_wage?: number;
  total_loan?: number;
  actual_wage?: number;
}

export interface WorkRecord {
  id: string;
  worker_id: string;
  worker_name?: string;
  date: string;
  blocks: number;
  packages: number;
  spec?: string;
  is_settled: boolean;
  settled_at?: string;
  created_at: string;
  updated_at: string;
  wage?: number;
}

export interface LoanRecord {
  id: string;
  worker_id: string;
  worker_name?: string;
  amount: number;
  reason?: string;
  loan_date: string;
  created_at: string;
  updated_at: string;
}

export interface SalarySettlement {
  id: string;
  worker_id: string;
  worker_name?: string;
  settlement_date: string;
  total_wage: number;
  total_loan: number;
  actual_payment: number;
  work_records: string[];
  notes?: string;
  created_at: string;
}

export type MaterialType = 'cement' | 'sand' | 'freight' | 'external_brick' | 'internal_brick' | 'site_supply';

export interface MaterialRecord {
  id: string;
  type: MaterialType;
  worker_name?: string;
  name: string;
  date: string;
  photo_url?: string;
  created_at: string;
  updated_at: string;
  // 水泥和砂石料专用
  quantity_tons?: number;
  unit_price?: number;
  total_amount?: number;
  // 运费明细专用
  spec?: string;
  quantity_blocks?: number;
  packages?: number;
  unit_price_1?: number;
  unit_price_2?: number;
  vehicle_number?: string;
  ticket_number?: string;
  delivery_location?: string;
  // 外调砖和内调砖专用
  color?: string;
  driver?: string;
  // 工地供货明细专用
  quantity?: number;
  quantity_unit?: string;
  amount?: number;
}

export interface ExportOptions {
  module: string;
  startDate?: string;
  endDate?: string;
  searchText?: string;
}