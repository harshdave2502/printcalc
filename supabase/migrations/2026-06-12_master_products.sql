-- ──────────────────────────────────────────────────────────────────────
-- Migration: Master Products + Subscriber Settings + Customer Overrides
-- Date: 2026-06-12
--
-- Architecture:
--   master_products            → ADMIN owns. Single global catalog.
--                                LOCKED fields: size_w, size_h, plate, total_ups
--                                (these drive price math).
--
--   subscriber_product_settings → SUBSCRIBER customizes display only.
--                                Cannot edit math-locked fields.
--
--   customer_product_overrides → ADMIN can override LOCKED math fields
--                                per specific customer (subscriber's client)
--                                for special cases like non-standard sizes.
-- ──────────────────────────────────────────────────────────────────────

-- ─── 1. master_products (admin owns) ─────────────────────────────────────
create table if not exists master_products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text default '',
  icon text default '📦',
  category text not null,                  -- card / sheet / folded / booklet / calendar / stationery / folder / envelope
  group_label text,                        -- A Series / B Series / US / Wedding / Indian etc.

  -- 🔒 LOCKED math fields (only admin can edit)
  size_w_inch numeric not null,
  size_h_inch numeric not null,
  plate text not null,                     -- '18×25"' / '20×29"' / etc.
  total_ups int not null,                  -- pieces per sheet

  -- ✏️ Subscriber-overridable defaults
  default_sides text default 'both',       -- 'one' | 'both'
  default_color text default 'four_color', -- 'four_color' | 'two_color' | 'single_color' | 'bw'
  default_paper_category text,             -- e.g. 'Art Paper' (suggestion)

  -- Display
  is_active boolean default true,
  sort_order int default 0,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_master_products_category on master_products (category);
create index if not exists idx_master_products_active on master_products (is_active);

-- ─── 2. subscriber_product_settings (subscriber's prefs per master) ──────
create table if not exists subscriber_product_settings (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references subscribers(id) on delete cascade,
  master_product_id uuid not null references master_products(id) on delete cascade,

  is_enabled boolean default true,

  -- ✏️ Display overrides (null = inherit from master)
  custom_display_name text,
  custom_description text,
  custom_icon text,
  custom_category text,                    -- subscriber may regroup products in their menu

  -- ✏️ Default overrides (null = inherit from master)
  custom_default_sides text,
  custom_default_color text,
  custom_default_paper_category text,

  -- Local sort order in subscriber's catalog
  sort_order int default 0,

  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (subscriber_id, master_product_id)
);

create index if not exists idx_subscriber_settings_subscriber on subscriber_product_settings (subscriber_id);

-- ─── 3. customer_product_overrides (admin per-customer overrides) ────────
create table if not exists customer_product_overrides (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  master_product_id uuid not null references master_products(id) on delete cascade,

  -- 🔓 Admin-only overrides for the math-locked fields
  override_size_w_inch numeric,
  override_size_h_inch numeric,
  override_plate text,
  override_total_ups int,

  notes text default '',
  created_at timestamptz default now(),
  unique (customer_id, master_product_id)
);

create index if not exists idx_customer_overrides_customer on customer_product_overrides (customer_id);

-- ─── RLS policies ────────────────────────────────────────────────────────
alter table master_products enable row level security;
alter table subscriber_product_settings enable row level security;
alter table customer_product_overrides enable row level security;

-- Master products: anyone can READ, only admin (you) inserts/updates
-- For now, allow public read. Admin role check handled in API/UI.
drop policy if exists "Public read master products" on master_products;
create policy "Public read master products" on master_products
  for select using (true);

drop policy if exists "Authenticated insert master products" on master_products;
create policy "Authenticated insert master products" on master_products
  for insert with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated update master products" on master_products;
create policy "Authenticated update master products" on master_products
  for update using (auth.role() = 'authenticated');

drop policy if exists "Authenticated delete master products" on master_products;
create policy "Authenticated delete master products" on master_products
  for delete using (auth.role() = 'authenticated');

-- Subscriber settings: subscriber manages their own row
drop policy if exists "Subscriber manages own settings" on subscriber_product_settings;
create policy "Subscriber manages own settings" on subscriber_product_settings
  for all using (auth.uid() = subscriber_id);

drop policy if exists "Public read subscriber settings" on subscriber_product_settings;
create policy "Public read subscriber settings" on subscriber_product_settings
  for select using (true);

-- Customer overrides: subscriber sees own customers' overrides
drop policy if exists "Subscriber reads own customer overrides" on customer_product_overrides;
create policy "Subscriber reads own customer overrides" on customer_product_overrides
  for select using (
    exists (
      select 1 from customers c
      where c.id = customer_product_overrides.customer_id
        and c.subscriber_id = auth.uid()
    )
  );

drop policy if exists "Public read customer overrides" on customer_product_overrides;
create policy "Public read customer overrides" on customer_product_overrides
  for select using (true);

-- ─── Updated_at triggers ─────────────────────────────────────────────────
drop trigger if exists trg_master_products_updated_at on master_products;
create trigger trg_master_products_updated_at
  before update on master_products
  for each row execute function set_updated_at_now();

drop trigger if exists trg_subscriber_settings_updated_at on subscriber_product_settings;
create trigger trg_subscriber_settings_updated_at
  before update on subscriber_product_settings
  for each row execute function set_updated_at_now();
