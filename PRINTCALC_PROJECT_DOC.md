# PrintCalc — Complete Project Documentation
> Last updated: March 30, 2026 | Use this doc to continue development in a new chat

---

## 🚀 Project Overview

**PrintCalc** is a SaaS platform for the printing industry that provides pricing and calculation tools.

- **Live URL:** https://printcalc-beta.vercel.app
- **GitHub:** https://github.com/harshdave2502/printcalc
- **Stack:** Next.js 16, TypeScript, Supabase, Vercel
- **Owner:** Harsh Dave (harshdave2502), India-based, US-facing
- **Business:** India-based printing SaaS, US-facing market

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), TypeScript |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth |
| Hosting | Vercel |
| Payments (planned) | Lemon Squeezy (international) + Razorpay (India) |
| Styling | Inline CSS only — NO Tailwind, NO CSS modules |

---

## 📁 File Structure

```
app/
  page.tsx                        ← Landing/marketing page (dark purple)
  calculator/page.tsx             ← Main subscriber calculator (Paper, Printing, Full Job tabs)
  dashboard/page.tsx              ← Printer dashboard (9 tabs)
  login/page.tsx                  ← Login → redirects to /calculator
  signup/page.tsx                 ← Signup with auto-seed rates
  quotes/page.tsx                 ← Quote management
  orders/page.tsx                 ← Order management
  customers/page.tsx              ← Customers page
  customer/page.tsx               ← Customer portal
  customer/login/page.tsx         ← Customer login
  customer/signup/page.tsx        ← Customer signup
  embed/[subscriberId]/page.tsx   ← iFrame embed with customer rates
  calculate/page.tsx              ← OLD static demo calculator (keep but don't use)
  supabase.ts                     ← Supabase client
  layout.tsx
  globals.css
```

---

## 🔑 Critical Developer Rules

### Supabase Import Paths (NEVER get this wrong)
```
app/page.tsx                    → import { supabase } from './supabase'
app/calculator/page.tsx         → import { supabase } from '../supabase'
app/dashboard/page.tsx          → import { supabase } from '../supabase'
app/login/page.tsx              → import { supabase } from '../supabase'
app/signup/page.tsx             → import { supabase } from '../supabase'
app/embed/[subscriberId]/page.tsx → import { supabase } from '../../supabase'
```

### React Rules
- **NEVER call useState inside .map() loops** — causes React crash
- Use single state objects keyed by name instead: `paperEdits`, `printFixedEdits` etc.
- Always use `useParams()` hook in Next.js 16 client components (NOT props params)

### Other Rules
- Windows PowerShell: run git commands separately (no `&&`)
- **No Tailwind** — inline CSS only throughout entire project
- Landing page is `app/page.tsx` — subscriber calculator is `app/calculator/page.tsx` (DIFFERENT files!)

---

## 🧮 Printing Industry Logic (FINALIZED — DO NOT CHANGE)

### Plate Usable Dimensions (after 0.25" gripper margin each side)
```
15×20"  → usable 14.5×19.5"  (paper: 20×30" cut in 2)
18×23"  → usable 17.5×22.5"  (paper: 23×36" exact)
18×25"  → usable 17.5×24.5"  (paper: 25×36" exact)
20×28"  → usable 19.5×27.5"  (paper: 20×30" LARGER — full height)
25×36"  → usable 24.5×35.5"  (paper: 25×36" exact)
```

### B Sizes (ALL on 20×28" plate)
```
B3: 13.5×19.5"  → 2 ups
B4: 9.75×13.75" → 4 ups
B5: 6.85×9.75"  → 8 ups
B6: 4.85×6.85"  → 16 ups
```

### Key Calculation Rules
- **Both portrait and landscape** orientations tried — best UPS used
- **Work & Turn:** 1 plate for front+back — impressions doubled, plate cost charged ONCE
- **Gripper already in usable dimensions** — no extra deduction needed
- **Custom sizes:** auto-select best plate (most UPS, smallest plate on tie)
- Minor size reductions up to 0.5" acceptable in real press practice

### Paper Cost Formula
```
factor = (parentW × parentH × 0.2666) / 828
weightPerRream = factor × GSM
costPerRream = weightPerRream × ratePerKg
costPerSheet = costPerRream / 500
total = costPerSheet × workingSheets
```

### Printing Cost Formula
```
plateFixed = fixed_charge × numPlates
freeImp = 1000 × numPlates
extraImp = max(0, impressions - freeImp)
extraRounded = ceil(extraImp / 1000) × 1000
total = plateFixed + (extraRounded / 1000) × per_1000_impression
```

### GSM → LB/PT Conversion
```
GSM < 170:  lb Text  = GSM ÷ 1.48
GSM ≥ 170:  lb Cover = GSM ÷ 2.71
PT: from chart (80=5pt, 130=8pt, 170=10pt, 200=12pt, 250=14pt, 300=16pt, 350=18pt)
```

---

## 🗄️ Database Schema

### Tables

#### subscribers
```sql
id uuid (auth.users id)
email text
business_name text
plan text -- 'free' | 'solo' | 'press_pro' | 'enterprise'
markup_percent numeric default 25
tax_percent numeric default 18
currency_symbol text default '₹'
logo_url text
created_at timestamptz
```

#### customers
```sql
id uuid primary key
email text
name text
company text
phone text
created_at timestamptz
markup_percent numeric  -- null = use subscriber default
notes text default ''
subscriber_id uuid references subscribers(id)
```

#### customer_rates
```sql
id uuid primary key
subscriber_id uuid references subscribers(id) on delete cascade
customer_id uuid references customers(id) on delete cascade
rate_type text  -- 'paper' | 'print_fixed' | 'print_per1000' | 'lam' | 'uv'
rate_key text   -- category name or 'PlateName__ColorOption'
custom_value numeric
created_at timestamptz
```

#### paper_categories
```sql
id uuid primary key
subscriber_id uuid references subscribers(id)
category text
rate_per_kg numeric
sort_order int
```

#### paper_stocks
```sql
id uuid primary key
subscriber_id uuid references subscribers(id)
category text
label text
gsm int
rate_per_kg numeric
in_stock boolean default true
sort_order int
```

#### sheet_sizes
```sql
id uuid primary key
name text
length_inch numeric
width_inch numeric
factor numeric  -- pre-calculated weight factor
is_active boolean
sort_order int
```

#### printing_rates
```sql
id uuid primary key
subscriber_id uuid references subscribers(id)
plate_name text     -- e.g. 'Small Plate (15×20, 18×23, 18×25)'
color_option text   -- e.g. 'Single Color', 'Four Color CMYK'
fixed_charge numeric
per_1000_impression numeric
sort_order int
```

#### lamination_rates
```sql
id uuid primary key
subscriber_id uuid references subscribers(id)
lam_name text       -- e.g. 'Matt Lamination', 'Gloss Lamination'
per_100_sqinch numeric
minimum_charge numeric
sort_order int
```

#### uv_rates
```sql
id uuid primary key
subscriber_id uuid references subscribers(id)
uv_name text        -- e.g. 'Full UV', 'Spot UV', 'Dripoff UV'
per_100_sqinch numeric
minimum_charge numeric
sort_order int
```

#### binding_rates
```sql
id uuid primary key
subscriber_id uuid references subscribers(id)
binding_name text   -- e.g. 'Saddle Stitch', 'Perfect Binding'
per_binding_format numeric
sort_order int
```

#### quotes
```sql
id uuid primary key
subscriber_id uuid references subscribers(id)
customer_name text
customer_email text
customer_phone text
company text
job_title text
size text
paper_type text
quantity int
sides text
color_option text
lamination text
uv_coating text
binding text
total_amount numeric
status text -- 'Draft'|'Sent'|'Converted'|'Expired'
notes text
created_at timestamptz
```

#### orders
```sql
id uuid primary key
subscriber_id uuid references subscribers(id)
customer_name text
customer_email text
job_title text
quantity int
total_amount numeric
advance_paid numeric default 0
due_amount numeric
status text -- 'Pending'|'In Production'|'Ready'|'Delivered'
notes text
created_at timestamptz
```

---

## 🔐 RLS Policies Required

Run these in Supabase SQL Editor if any are missing:

```sql
-- subscribers: public read for embed page
create policy "Public read subscribers for embed" on subscribers
for select using (true);

-- sheet_sizes: public read
create policy "Public read sheet sizes" on sheet_sizes
for select using (true);

-- paper_stocks: public read
create policy "Public read paper stocks" on paper_stocks
for select using (true);

-- paper_categories: public read
create policy "Public read paper categories" on paper_categories
for select using (true);

-- printing_rates: public read
create policy "Public read printing rates" on printing_rates
for select using (true);

-- lamination_rates: public read
create policy "Public read lamination rates" on lamination_rates
for select using (true);

-- uv_rates: public read
create policy "Public read uv rates" on uv_rates
for select using (true);

-- binding_rates: public read
create policy "Public read binding rates" on binding_rates
for select using (true);

-- customer_rates: public read
create policy "Public read customer rates" on customer_rates
for select using (true);

-- customers: subscriber manages their customers
drop policy if exists "Subscriber manages customers" on customers;
create policy "Subscriber manages customers" on customers
for all using (auth.uid() = subscriber_id);

-- customers: customer views own profile
drop policy if exists "Customers view own profile" on customers;
create policy "Customers view own profile" on customers
for select using (auth.uid() = id);
```

---

## 🧩 Features Built

### ✅ Auto-seed on Signup
`app/signup/page.tsx` seeds for every new subscriber:
- 7 paper categories
- 19 paper stocks
- 9 printing rates
- 3 lamination rates
- 3 UV rates
- 3 binding rates

### ✅ Main Calculator (`app/calculator/page.tsx`)
Three tabs:
1. **Paper tab** — sheet size × paper stock × quantity
2. **Printing tab** — auto plate detection, colors, sides, lam, UV
3. **Full Job tab** — Single Item OR Brochure/Book mode

Features:
- Auto plate detection from final size (no manual plate selection)
- IN/MM/CM size converter for custom sizes
- GSM → lb Text / lb Cover / PT info next to every GSM dropdown
- "Both Sides" label (renamed from "Front + Back")
- Specific process names in cost breakdown (Matt Lamination, Spot UV, etc.)

### ✅ Dashboard (`app/dashboard/page.tsx`)
9 tabs: Overview | Printing Rates | Customers | Quotes | Orders | Paper Rates | Stock Management | Embed & API | Settings

### ✅ Customer Management
- Add customers with name, email, phone, company, custom markup
- Per-customer rates: paper, print fixed/per1000, lam, UV
- Copy unique calculator link per customer
- State uses objects (not hooks in loops): `paperEdits`, `printFixedEdits` etc.

### ✅ iFrame Embed (`app/embed/[subscriberId]/page.tsx`)
- URL: `/embed/[subscriberId]?c=[customerId]`
- Uses `useParams()` hook (NOT props) for subscriberId
- Customer ID from URLSearchParams
- Tabs: 🖨️ Calculator | 📋 My Quotes | 📦 My Orders
- Same calculator as subscriber (Single Item + Brochure/Book)
- Customer sees: final price + per piece + GST + job summary only (NO cost breakdown)
- 3 action buttons: 📄 PDF Quote | 📋 Save Quote | 🛒 Order Now
- PDF uses browser print with company letterhead
- Save Quote → saves to quotes + appears in My Quotes
- Order Now → saves to orders + appears in My Orders
- Progress tracker in My Orders (Pending → In Production → Ready → Delivered)
- Customer-specific rates applied automatically from customer_rates table

---

## 🧪 Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Subscriber | harshdave35@gmail.com | Hd@123 |
| Customer | hdsocial25@gmail.com | 1234567 |

| ID | Value |
|----|-------|
| Subscriber ID | b22867f7-885e-46b9-b927-2faa604da894 |
| Customer ID | a3a7fbdb-4114-4b09-8cb2-0c718b0959e8 |

**Embed test URL:**
```
https://printcalc-beta.vercel.app/embed/b22867f7-885e-46b9-b927-2faa604da894?c=a3a7fbdb-4114-4b09-8cb2-0c718b0959e8
```

---

## 💰 Business Model

| Plan | Price | Features |
|------|-------|---------|
| Free | ₹0 | Calculator only |
| Solo | ₹499/mo | iFrame embed |
| Press Pro | ₹1,999/mo | iFrame embed + customer management |
| Enterprise | Custom | API access (future) |

**Payments:** Lemon Squeezy (international) + Razorpay (India) — **NOT YET BUILT**

**Integration tiers:** Direct use | iFrame embed | API (future)

---

## 🔧 Common Build Errors & Fixes

| Error | Fix |
|-------|-----|
| `Module not found: Can't resolve './supabase'` | Check import path table above |
| `useState inside .map()` | Use single state objects keyed by name |
| `id=eq.undefined` | Use `useParams()` hook not props in Next.js 16 |
| `Expected '</', got '}'` | JSX syntax broken in tbody |
| `42710: policy already exists` | Use `drop policy if exists` first |
| `42601: syntax error at 'not'` | Supabase doesn't support `create policy if not exists` |
| `42703: column does not exist` | Verify schema with `select column_name from information_schema.columns where table_name = 'X'` |
| Dashboard tabs show blank | Check for hooks in loops in that component |
| Embed shows "Calculator not found" | Check RLS policies — all tables need public read |
| Embed stuck on "Loading..." | Check browser console for `id=eq.undefined` error |

---

## 🗂️ Navigation Flow

```
/ (landing page)
  ↓ Login
/calculator  (main subscriber calculator)
  navbar: Quotes | Orders | Dashboard | Logout

/dashboard
  navbar: ← Calculator | business name | plan | Logout
  tabs: Overview | Printing Rates | Customers | Quotes | Orders | Paper Rates | Stock Management | Embed & API | Settings

/embed/[subscriberId]?c=[customerId]
  tabs: Calculator | My Quotes | My Orders
```

---

## 📋 Pending / TODO

- [ ] Payment integration (Lemon Squeezy + Razorpay)
- [ ] Plan enforcement (check plan before showing embed features)
- [ ] API access for Enterprise tier
- [ ] Email notifications when customer requests quote
- [ ] Quote expiry (7 days auto-expire)
- [ ] Dashboard Overview stats (revenue, quote count etc.)
- [ ] Logo upload for subscriber branding
- [ ] Customer portal login system (currently customers use embed link only)

---

## 🔄 How to Continue in a New Chat

Paste this into your new chat:

> "I'm continuing development on PrintCalc, a printing industry SaaS. Here is my project documentation: [paste this file]. The GitHub repo is harshdave2502/printcalc and live site is printcalc-beta.vercel.app. Continue from where we left off."

**Key context to mention:**
- Stack: Next.js 16, TypeScript, Supabase, Vercel
- No Tailwind — inline CSS only
- Real calculator is `app/calculator/page.tsx` NOT `app/page.tsx` (landing page)
- Supabase import paths differ per folder depth (see table above)
- Never use useState in .map() loops
- Always use useParams() for dynamic routes

---

*Generated March 30, 2026 — PrintCalc v0.1 Beta*
