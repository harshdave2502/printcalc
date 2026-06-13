-- ──────────────────────────────────────────────────────────────────────
-- Migration: Reseller-mode products
-- Date: 2026-06-13
-- Purpose: Some subscribers RESELL finished products from a vendor (e.g.
--          PP files bought from Gandhi Card) rather than manufacture them.
--          For resold products the calc is:
--              final = vendor_rate(variant, qty) × (1 + markup%) + extras × 1
--          + tax%. No paper/printing math.
-- ──────────────────────────────────────────────────────────────────────

alter table subscriber_products
  add column if not exists product_type text default 'manufactured'
    check (product_type in ('manufactured', 'resold')),
  add column if not exists vendor_name text,
  add column if not exists vendor_markup_percent numeric default 30,
  add column if not exists vendor_gst_percent numeric default 18;

-- Vendor rate table: one row per (size × thickness × finish × sides)
-- with rates for each qty slab. Variant axes are free text so the
-- subscriber can name them however the vendor names them.
create table if not exists subscriber_product_resold_rates (
  id uuid primary key default gen_random_uuid(),
  subscriber_product_id uuid not null
    references subscriber_products(id) on delete cascade,
  size_label text,         -- e.g. "12 x 18"
  thickness text,          -- e.g. "12 mic" or "350 mic" or "300 gsm"
  finish text,             -- "Matt", "Gloss", "Spot UV + Drip-Off"
  sides text,              -- "SS" or "FB"
  rate_1k numeric,
  rate_2k numeric,
  rate_3k numeric,
  rate_5k numeric,
  rate_10k numeric,
  notes text,
  sort_order int default 0,
  created_at timestamptz default now()
);

create index if not exists idx_resold_rates_product
  on subscriber_product_resold_rates (subscriber_product_id);

-- Per-piece extras (clip, pouch, eyelet, die-cut, etc).
-- Charged after rate × markup, before GST.
create table if not exists subscriber_product_resold_extras (
  id uuid primary key default gen_random_uuid(),
  subscriber_product_id uuid not null
    references subscriber_products(id) on delete cascade,
  extra_name text not null,
  rate numeric not null default 0,
  unit text default 'per_piece'
    check (unit in ('per_piece', 'per_side', 'per_clip', 'per_order')),
  is_optional boolean default true,
  sort_order int default 0,
  created_at timestamptz default now()
);

create index if not exists idx_resold_extras_product
  on subscriber_product_resold_extras (subscriber_product_id);

-- RLS
alter table subscriber_product_resold_rates enable row level security;
alter table subscriber_product_resold_extras enable row level security;

drop policy if exists "Subscribers manage their resold rates" on subscriber_product_resold_rates;
create policy "Subscribers manage their resold rates"
  on subscriber_product_resold_rates for all
  using (
    exists (
      select 1 from subscriber_products p
      where p.id = subscriber_product_id and p.subscriber_id = auth.uid()
    )
  );

drop policy if exists "Public read resold rates" on subscriber_product_resold_rates;
create policy "Public read resold rates"
  on subscriber_product_resold_rates for select using (true);

drop policy if exists "Subscribers manage their resold extras" on subscriber_product_resold_extras;
create policy "Subscribers manage their resold extras"
  on subscriber_product_resold_extras for all
  using (
    exists (
      select 1 from subscriber_products p
      where p.id = subscriber_product_id and p.subscriber_id = auth.uid()
    )
  );

drop policy if exists "Public read resold extras" on subscriber_product_resold_extras;
create policy "Public read resold extras"
  on subscriber_product_resold_extras for select using (true);
