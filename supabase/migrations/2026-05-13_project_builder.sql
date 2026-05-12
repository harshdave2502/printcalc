-- ──────────────────────────────────────────────────────────────────────
-- Migration: Project Builder (Mode 3)
-- Date: 2026-05-13
-- Purpose: Multi-product project quoting — designers/traders bundle
--          several products in one quote with optional reseller margin.
-- ──────────────────────────────────────────────────────────────────────

-- 1) Projects table — one row per project
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references subscribers(id) on delete cascade,
  project_number text,                     -- generated like P20260513-123
  name text not null,                      -- "Acme Corp Brand Launch"
  customer_name text default '',
  customer_email text default '',
  customer_phone text default '',
  customer_company text default '',
  status text default 'Draft',             -- Draft | Sent | Approved | Converted | Expired
  notes text default '',
  subtotal numeric default 0,
  margin_percent numeric default 0,        -- designer's own reseller margin
  margin_amount numeric default 0,
  tax_percent numeric default 0,
  tax_amount numeric default 0,
  total_amount numeric default 0,
  currency_symbol text default '$',
  valid_until date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_projects_subscriber on projects (subscriber_id);
create index if not exists idx_projects_status on projects (status);

-- 2) Project items table — line items inside a project
create table if not exists project_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  subscriber_product_id uuid references subscriber_products(id) on delete set null,
  template_id text,
  display_name text not null,              -- snapshot of product name (in case product is renamed/deleted later)
  icon text default '',
  quantity int default 0,
  unit_price numeric default 0,            -- per-piece price
  line_total numeric default 0,            -- quantity × unit_price (computed once + stored)
  item_data jsonb,                         -- full config: paper, size, sides, color, custom fields
  sort_order int default 0,
  created_at timestamptz default now()
);

create index if not exists idx_project_items_project on project_items (project_id);

-- ──────────────────────────────────────────────────────────────────────
-- RLS policies
-- ──────────────────────────────────────────────────────────────────────

alter table projects enable row level security;
alter table project_items enable row level security;

drop policy if exists "Subscribers manage their projects" on projects;
create policy "Subscribers manage their projects" on projects
  for all using (auth.uid() = subscriber_id);

drop policy if exists "Public read projects (for shared quote view)" on projects;
create policy "Public read projects (for shared quote view)" on projects
  for select using (true);

drop policy if exists "Subscribers manage their project items" on project_items;
create policy "Subscribers manage their project items" on project_items
  for all using (
    exists (
      select 1 from projects p
      where p.id = project_items.project_id
        and p.subscriber_id = auth.uid()
    )
  );

drop policy if exists "Public read project items" on project_items;
create policy "Public read project items" on project_items
  for select using (true);

-- ──────────────────────────────────────────────────────────────────────
-- Updated_at trigger
-- ──────────────────────────────────────────────────────────────────────
drop trigger if exists trg_projects_updated_at on projects;
create trigger trg_projects_updated_at
  before update on projects
  for each row execute function set_updated_at_now();

-- ──────────────────────────────────────────────────────────────────────
-- Done.
-- ──────────────────────────────────────────────────────────────────────
