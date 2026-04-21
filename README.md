# 工地管理系统

基于 Next.js 14 + Supabase + 七牛云的工地管理 SaaS 平台。

## 功能模块

- **工资结算管理** - 工人工资录入、查询、结算、导出
- **物料管理** - 水泥、砂石料等物料记录
- **车辆管理** - 车队车辆信息管理
- **数据导出** - Excel 格式数据导出

## 技术栈

- **前端框架**: Next.js 14 (App Router)
- **数据库**: Supabase (PostgreSQL)
- **文件存储**: 七牛云（可选）
- **样式框架**: Tailwind CSS + Radix UI
- **部署平台**: Vercel

## 在线体验

**测试站点**: https://site-management-system-eight.vercel.app

**测试账号**：
- 用户名: `admin`
- 密码: `admin123`

> ⚠️ **功能说明**：当前测试站未配置七牛云，图片上传实时预览功能暂不可用，但其他功能完好。如需完整功能体验，请自行部署并配置七牛云。

> ⚠️ **免责声明**：测试站仅供功能体验，所有填写的数据均为公开信息。**请勿在测试站填写任何真实个人信息或敏感数据**，因误填造成的任何信息泄露或后果，项目作者概不负责。如需使用真实数据，请部署自己的版本。

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/ruyunai/Site-management-system.git
cd Site-management-system
```

### 2. 配置环境变量

```bash
cp .env.example .env.local
```

编辑 `.env.local` 文件，填入你的 Supabase 和七牛云凭证。详见 [环境变量配置清单](./环境变量配置清单.txt)

### 3. 安装依赖

```bash
npm install
```

### 4. 启动开发服务器

```bash
npm run dev
```

打开 http://localhost:3000 查看效果。

## 部署

### Supabase 数据库配置

1. 登录 [Supabase](https://supabase.com)
2. 创建新项目
3. 点击左侧 **SQL Editor** → **New Query**
4. 复制以下 SQL 并执行：

```sql
-- 用户表
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 工资单价设置表
CREATE TABLE wage_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  package_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 工人表
CREATE TABLE workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  age INTEGER,
  job_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 工作记录表
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

-- 借资记录表
CREATE TABLE loan_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  reason TEXT,
  loan_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 工资结算记录表
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

-- 物料记录表
CREATE TABLE material_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  worker_name TEXT,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  quantity_tons DECIMAL(10, 2),
  unit_price DECIMAL(10, 2),
  total_amount DECIMAL(10, 2),
  spec TEXT,
  quantity_blocks INTEGER,
  packages INTEGER,
  unit_price_1 DECIMAL(10, 2),
  unit_price_2 DECIMAL(10, 2),
  vehicle_number TEXT,
  ticket_number TEXT,
  color TEXT,
  driver TEXT,
  quantity DECIMAL(10, 2),
  quantity_unit TEXT,
  amount DECIMAL(10, 2)
);

-- 初始化默认设置
INSERT INTO wage_settings (block_price, package_price) VALUES (0, 0);

-- 初始化默认管理员账号
INSERT INTO users (username, password) VALUES ('admin', 'admin123');

-- 启用 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wage_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_records ENABLE ROW LEVEL SECURITY;

-- 创建公开访问策略
CREATE POLICY "Allow public access" ON users FOR ALL USING (true);
CREATE POLICY "Allow public access" ON wage_settings FOR ALL USING (true);
CREATE POLICY "Allow public access" ON workers FOR ALL USING (true);
CREATE POLICY "Allow public access" ON work_records FOR ALL USING (true);
CREATE POLICY "Allow public access" ON loan_records FOR ALL USING (true);
CREATE POLICY "Allow public access" ON salary_settlements FOR ALL USING (true);
CREATE POLICY "Allow public access" ON material_records FOR ALL USING (true);
```

**默认管理员账号**：
- 用户名: `admin`
- 密码: `admin123`

### Vercel 部署

1. 登录 [Vercel](https://vercel.com)
2. Import GitHub 仓库
3. 配置环境变量（参考 `.env.example`）
4. 点击 Deploy

## 项目结构

```
├── src/
│   ├── app/              # Next.js App Router 页面
│   ├── components/       # React 组件
│   ├── hooks/           # 自定义 Hooks
│   ├── lib/             # 工具函数
│   └── types/           # TypeScript 类型定义
├── supabase/
│   └── schema.sql       # 数据库 Schema
├── .env.example         # 环境变量模板
└── 环境变量配置清单.txt  # 环境变量配置说明
```

## 许可证

MIT License
