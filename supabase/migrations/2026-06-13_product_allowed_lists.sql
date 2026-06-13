-- ──────────────────────────────────────────────────────────────────────
-- Migration: Per-product allowed lists + setup gate
-- Date: 2026-06-13
-- Purpose: Each subscriber_product carries its OWN allowed sizes,
-- papers, colors, sides, bindings, lamination, UV, pasting.
-- Customer only sees options the subscriber has turned on for
-- this specific product. Products are hidden from customers until
-- is_setup_complete = true.
-- ──────────────────────────────────────────────────────────────────────

alter table subscriber_products
  -- Sizes
  add column if not exists allowed_size_ids text[] default '{}',
  add column if not exists default_size_id text,
  add column if not exists allow_custom_size boolean default false,

  -- Paper
  add column if not exists default_paper_category text,
  add column if not exists default_gsm int,

  -- Print options
  add column if not exists allowed_colors text[] default '{}',
  add column if not exists allowed_sides text[] default '{}',

  -- Finishing / binding (references to rows in the subscriber's rate tables)
  add column if not exists allowed_binding_ids uuid[] default '{}',
  add column if not exists allowed_lamination_ids uuid[] default '{}',
  add column if not exists allowed_uv_ids uuid[] default '{}',
  add column if not exists allowed_pasting_ids uuid[] default '{}',

  -- Setup gate
  add column if not exists is_setup_complete boolean default false;

-- Index for quick "give me only complete products" customer-side queries
create index if not exists idx_subscriber_products_setup_complete
  on subscriber_products (subscriber_id, is_setup_complete)
  where is_setup_complete = true;
