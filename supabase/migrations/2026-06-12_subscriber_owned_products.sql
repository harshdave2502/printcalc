-- ──────────────────────────────────────────────────────────────────────
-- Migration: Subscriber-owned products (rollback from master-catalog)
-- Date: 2026-06-12
-- Purpose:
--   Subscribers create their own products. Add the fields the create
--   form needs to enforce as required:
--     • default_qty             (starting MOQ shown to customer)
--     • allowed_paper_categories (which paper categories this product accepts)
--
--   Plate + total_ups are NOT stored — they are derived at calc time
--   from default_size_w_inch / default_size_h_inch via SIZE_PLATE_MAP.
-- ──────────────────────────────────────────────────────────────────────

alter table subscriber_products
  add column if not exists default_qty int default 1000,
  add column if not exists allowed_paper_categories text[] default '{}';

-- Backfill: any existing rows get a sensible default
update subscriber_products
   set default_qty = coalesce(default_qty, 1000)
 where default_qty is null;
