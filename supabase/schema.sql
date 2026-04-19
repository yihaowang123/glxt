-- 工地管理系统数据库Schema

-- 1. 用户表（独立用户表，不依赖Supabase Auth）
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 工资单价设置表（全局唯一）
CREATE TABLE wage_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  package_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 初始化一条默认设置
INSERT INTO wage_settings (block_price, package_price) VALUES (0, 0);

-- 3. 工人表
CREATE TABLE workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  age INTEGER,
  job_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 工作记录表
CREATE TABLE work_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  blocks INTEGER DEFAULT 0,
  packages INTEGER DEFAULT 0,
  spec TEXT,
  is_settled BOOLEAN DEFAULT FALSE,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 借资记录表
CREATE TABLE loan_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  reason TEXT,
  loan_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 工资结算记录表
CREATE TABLE salary_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
  settlement_date DATE NOT NULL,
  total_wage DECIMAL(10, 2) NOT NULL,
  total_loan DECIMAL(10, 2) NOT NULL,
  actual_payment DECIMAL(10, 2) NOT NULL,
  work_records TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. 物料记录表（统一表，用type字段区分）
CREATE TABLE material_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  worker_name TEXT,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  -- 通用字段
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- 水泥和砂石料专用字段
  quantity_tons DECIMAL(10, 2),
  unit_price DECIMAL(10, 2),
  total_amount DECIMAL(10, 2),
  -- 运费明细专用字段
  spec TEXT,
  quantity_blocks INTEGER,
  packages INTEGER,
  unit_price_1 DECIMAL(10, 2),
  unit_price_2 DECIMAL(10, 2),
  vehicle_number TEXT,
  ticket_number TEXT,
  -- 外调砖和内调砖专用字段
  color TEXT,
  driver TEXT,
  -- 工地供货明细专用字段
  quantity DECIMAL(10, 2),
  quantity_unit TEXT,
  amount DECIMAL(10, 2)
);

-- 创建索引优化查询性能
CREATE INDEX idx_work_records_worker_date ON work_records(worker_id, date);
CREATE INDEX idx_work_records_settled ON work_records(is_settled);
CREATE INDEX idx_loan_records_worker_date ON loan_records(worker_id, loan_date);
CREATE INDEX idx_salary_settlements_worker ON salary_settlements(worker_id);
CREATE INDEX idx_material_records_type_date ON material_records(type, date);