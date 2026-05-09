-- ──────────────────────────────────────────────────────────────────────
-- Migration: Product Templates v2
-- Date: 2026-05-09
-- Purpose: Add template-based product catalog with per-subscriber
--          customization. Existing tables remain untouched.
-- ──────────────────────────────────────────────────────────────────────

-- 1) Subscribers: add country code for terminology localization
alter table subscribers
  add column if not exists country_code text default 'US';

-- 2) Subscriber products — printer's customized products built from templates
create table if not exists subscriber_products (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references subscribers(id) on delete cascade,
  template_id text not null,                -- e.g. 'card', 'sheet', 'folded', 'booklet', 'calendar', 'stationery', 'folder'
  slug text not null,                       -- url-safe, e.g. 'business-card', 'visiting-card', 'wedding-invite'
  display_name text not null,               -- e.g. "Visiting Card", "Wedding Invitation"
  description text default '',              -- shown to customers
  icon text default '',                     -- emoji or icon name
  is_enabled boolean default true,
  sort_order int default 0,
  default_size_label text,                  -- e.g. "3.5×2 in" or "A6 (105×148 mm)"
  default_size_w_inch numeric,
  default_size_h_inch numeric,
  default_paper_label text,
  default_color text default 'four_color',  -- 'single_color' | 'two_color' | 'four_color' | 'bw'
  default_sides text default 'one',         -- 'one' | 'both'
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (subscriber_id, slug)
);

create index if not exists idx_subscriber_products_subscriber on subscriber_products (subscriber_id);
create index if not exists idx_subscriber_products_template on subscriber_products (template_id);

-- 3) Product field overrides — per-product field-level customization
--    (toggle optional fields on/off, rename labels, override default options)
create table if not exists subscriber_product_fields (
  id uuid primary key default gen_random_uuid(),
  subscriber_product_id uuid not null references subscriber_products(id) on delete cascade,
  field_key text not null,                  -- e.g. 'lamination', 'uv', 'rounded_corners', 'foiling'
  is_enabled boolean default true,
  custom_label text,                        -- override default field label
  custom_options jsonb,                     -- override default options list
  sort_order int default 0,
  unique (subscriber_product_id, field_key)
);

-- 4) Custom fields — printer-added fields not in any template
create table if not exists subscriber_product_custom_fields (
  id uuid primary key default gen_random_uuid(),
  subscriber_product_id uuid not null references subscriber_products(id) on delete cascade,
  field_key text not null,                  -- url-safe identifier
  label text not null,                      -- shown to customer
  field_type text not null default 'text',  -- 'text' | 'number' | 'dropdown' | 'checkbox'
  options jsonb,                            -- for dropdown: [{value, label, price_delta}]
  is_required boolean default false,
  price_impact text default 'none',         -- 'none' | 'flat' | 'per_unit' | 'percent'
  price_value numeric default 0,
  help_text text,
  sort_order int default 0,
  created_at timestamptz default now(),
  unique (subscriber_product_id, field_key)
);

-- 5) Quotes & Orders: link to product (additive, doesn't break old rows)
alter table quotes
  add column if not exists subscriber_product_id uuid references subscriber_products(id) on delete set null,
  add column if not exists template_id text,
  add column if not exists product_data jsonb;

alter table orders
  add column if not exists subscriber_product_id uuid references subscriber_products(id) on delete set null,
  add column if not exists template_id text,
  add column if not exists product_data jsonb;

-- ──────────────────────────────────────────────────────────────────────
-- Row Level Security policies
-- ──────────────────────────────────────────────────────────────────────

alter table subscriber_products enable row level security;
alter table subscriber_product_fields enable row level security;
alter table subscriber_product_custom_fields enable row level security;

-- Subscribers manage their own products
drop policy if exists "Subscribers manage their products" on subscriber_products;
create policy "Subscribers manage their products" on subscriber_products
  for all using (auth.uid() = subscriber_id);

-- Public read for embed/iframe
drop policy if exists "Public read subscriber_products" on subscriber_products;
create policy "Public read subscriber_products" on subscriber_products
  for select using (true);

drop policy if exists "Public read product fields" on subscriber_product_fields;
create policy "Public read product fields" on subscriber_product_fields
  for select using (true);

drop policy if exists "Public read custom fields" on subscriber_product_custom_fields;
create policy "Public read custom fields" on subscriber_product_custom_fields
  for select using (true);

-- Subscribers manage their product fields/custom fields
drop policy if exists "Subscribers manage product fields" on subscriber_product_fields;
create policy "Subscribers manage product fields" on subscriber_product_fields
  for all using (
    exists (
      select 1 from subscriber_products sp
      where sp.id = subscriber_product_fields.subscriber_product_id
        and sp.subscriber_id = auth.uid()
    )
  );

drop policy if exists "Subscribers manage custom fields" on subscriber_product_custom_fields;
create policy "Subscribers manage custom fields" on subscriber_product_custom_fields
  for all using (
    exists (
      select 1 from subscriber_products sp
      where sp.id = subscriber_product_custom_fields.subscriber_product_id
        and sp.subscriber_id = auth.uid()
    )
  );

-- ──────────────────────────────────────────────────────────────────────
-- Updated_at trigger for subscriber_products
-- ──────────────────────────────────────────────────────────────────────
create or replace function set_updated_at_now()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_subscriber_products_updated_at on subscriber_products;
create trigger trg_subscriber_products_updated_at
  before update on subscriber_products
  for each row execute function set_updated_at_now();

-- ──────────────────────────────────────────────────────────────────────
-- Done.
-- ──────────────────────────────────────────────────────────────────────
