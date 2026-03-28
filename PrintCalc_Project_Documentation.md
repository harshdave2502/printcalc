# PrintCalc — Complete Project Documentation
> Last updated: March 2026
> Use this document to brief any AI agent about the full project without explaining from scratch.

---

## 🌐 Live App
- **Production URL:** https://printcalc-beta.vercel.app
- **GitHub Repo:** https://github.com/harshdave2502/printcalc
- **Local Dev:** http://localhost:3000 (run `npm run dev`)

---

## 🧑‍💻 Tech Stack
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Inline CSS + CSS-in-JS (no Tailwind) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Hosting | Vercel (auto-deploy from GitHub) |
| Fonts | Plus Jakarta Sans, DM Sans, DM Mono |
| Payments (planned) | Razorpay, GooglePay, UPI, AmazonPay |

---

## 📁 Project Folder Structure
```
printcalc/
├── app/
│   ├── page.tsx                  ← Homepage (Landing page)
│   ├── layout.tsx                ← Root layout
│   ├── globals.css               ← Global styles
│   ├── supabase.ts               ← Supabase client
│   ├── calculator/
│   │   └── page.tsx              ← Main calculator (Paper, Printing, Full Job)
│   ├── dashboard/
│   │   └── page.tsx              ← Printer dashboard (rates, stocks, settings)
│   ├── login/
│   │   └── page.tsx              ← Printer login
│   ├── signup/
│   │   └── page.tsx              ← Printer signup
│   ├── quotes/
│   │   └── page.tsx              ← Quote management + PDF export
│   ├── orders/
│   │   └── page.tsx              ← Order management + payment tracking
│   ├── customers/
│   │   └── page.tsx              ← Customers management (printer side)
│   ├── customer/
│   │   ├── page.tsx              ← Customer portal dashboard
│   │   ├── login/
│   │   │   └── page.tsx          ← Customer login
│   │   └── signup/
│   │       └── page.tsx          ← Customer signup
│   └── landing/
│       └── page.tsx              ← Landing page backup copy
├── public/                       ← Static assets
├── package.json
├── supabase.ts                   ← Supabase connection
└── .env.local                    ← Supabase keys (never commit this!)
```

---

## 🗄️ Supabase Database Tables

### 1. `subscribers` — Printer/Press Owner accounts
```sql
id uuid (primary key, matches auth.users)
email text
business_name text
currency text (e.g. INR, USD)
currency_symbol text (e.g. ₹, $)
markup_percent numeric (default 25)
tax_percent numeric (default 18)
plan text (free, solo, press_pro)
plan_status text (active, expired)
created_at timestamptz
```

### 2. `customers` — Customers of press owners
```sql
id uuid (primary key, matches auth.users)
email text unique
name text
company text
phone text
created_at timestamptz
```
> ⚠️ Currently customers are not linked to a specific subscriber. This is a pending feature (invite link system).

### 3. `paper_categories` — Paper type categories
```sql
id uuid
subscriber_id uuid (→ subscribers)
category text (e.g. Art Card, Maplitho)
rate_per_kg numeric
```

### 4. `paper_stocks` — Individual paper stocks
```sql
id uuid
subscriber_id uuid
category text
label text
gsm integer
packing_size integer
in_stock boolean
stock_qty numeric
sort_order integer
```

### 5. `sheet_sizes` — Standard sheet sizes
```sql
id uuid
name text
length_inch numeric
width_inch numeric
factor numeric
is_active boolean
sort_order integer
```

### 6. `printing_rates` — Plate & impression rates
```sql
id uuid
subscriber_id uuid
plate_name text
color_option text
fixed_charge numeric
per_1000_impression numeric
sort_order integer
```

### 7. `lamination_rates`
```sql
id uuid
subscriber_id uuid
lam_name text
minimum_charge numeric
per_100_sqinch numeric
sort_order integer
```

### 8. `uv_rates`
```sql
id uuid
subscriber_id uuid
uv_name text
minimum_charge numeric
per_100_sqinch numeric
sort_order integer
```

### 9. `binding_rates`
```sql
id uuid
subscriber_id uuid
binding_name text
per_binding_format numeric
sort_order integer
```

### 10. `color_options`
```sql
id uuid
subscriber_id uuid
color_name text
sort_order integer
```

### 11. `quotes`
```sql
id uuid
subscriber_id uuid
quote_number text
customer_name text
customer_email text
customer_phone text
customer_company text
job_title text
job_size text
paper_type text
quantity integer
sides text
finishing text
subtotal numeric
markup_amount numeric
markup_percent numeric
tax_amount numeric
tax_percent numeric
total_amount numeric
currency_symbol text
notes text
status text (Draft, Sent, Converted, Expired)
valid_until date
created_at timestamptz
```

### 12. `orders`
```sql
id uuid
subscriber_id uuid
order_number text
customer_name text
customer_email text
customer_phone text
customer_company text
job_title text
job_size text
paper_type text
quantity integer
sides text
finishing text
total_amount numeric
advance_paid numeric
due_amount numeric
currency_symbol text
notes text
status text (Pending, In Production, Ready, Delivered, Cancelled)
payment_status text (Unpaid, Partial, Paid)
delivery_date date
quote_id uuid (→ quotes, nullable)
quote_number text
created_at timestamptz
```

---

## 🔐 Row Level Security (RLS) Policies

### subscribers table
- Users can only read/write their own row

### paper_categories, paper_stocks, printing_rates, lamination_rates, uv_rates, binding_rates, color_options
- Users manage only their own rows (`subscriber_id = auth.uid()`)

### quotes & orders
- Subscribers manage their own (`subscriber_id = auth.uid()`)
- Customers can view their own by email:
```sql
customer_email = (select email from customers where id = auth.uid())
```

### customers table
- Customer can view their own profile (`auth.uid() = id`)
- Customer can insert their own profile on signup

---

## 👤 User Types & Login Flow

### Type 1 — Printer / Press Owner (Subscriber)
- Signs up at: `/signup`
- Logs in at: `/login`
- After login goes to: `/dashboard`
- Stored in: `subscribers` table
- Can access: Calculator, Dashboard, Quotes, Orders, Customers, Rates

### Type 2 — Customer of a Printer
- Signs up at: `/customer/signup`
- Logs in at: `/customer/login`
- After login goes to: `/customer`
- Stored in: `customers` table
- Can see: Only their own quotes & orders (by email match)
- Cannot see: Any rates or pricing breakdown

> ⚠️ PENDING: Customer-to-printer linking via invite link system not yet built.

---

## 🖩 Calculator Features

### Tab 1 — Paper Calculator
- Select sheet size & paper stock
- Enter quantity (sheets)
- Calculates: weight, cost per sheet, total with markup & GST

### Tab 2 — Printing Calculator
- Select final size (A2-A6, Letter, Legal, B sizes, custom)
- Select plate size & color options
- Choose sides (single/double)
- Add lamination & UV coating
- Calculates: UPS, working sheets, impressions, total cost

### Tab 3 — Full Job Calculator
- **Single Item mode:** Paper + Printing + Finishing all-in-one
- **Brochure/Book mode:** Cover + Inner pages + Binding
- Auto-calculates binding formats per copy

### Key Calculation Logic
```
UPS = how many pieces fit on one plate
Working Sheets = ceil(quantity / UPS)
Impressions = working sheets × sides
Paper Cost = (plate_area × GSM × rate_per_kg) / 500 × sheets
Printing Cost = fixed_charge + (extra_impressions/1000 × per_1000_rate)
Final Price = (subtotal + markup%) + GST%
```

---

## 📊 Dashboard Tabs
1. **Overview** — Live stats: quotes, orders, revenue, balance due
2. **Printing Rates** — Manage plate rates, lamination, UV, binding, color options
3. **Customers** — View all customers (sample data, real page at /customers)
4. **Quotes** — Link to /quotes page
5. **Orders** — Link to /orders page
6. **Paper Rates** — Edit rate per kg for each paper category
7. **Stock Management** — Track paper stock quantities
8. **Settings** — Business name, markup %, GST %, logout

---

## 📋 Quotes Page (`/quotes`)
- Create quotes with customer info + job details
- Auto-calculates markup & GST from subscriber settings
- Save to Supabase
- Print/Export as PDF (browser print)
- Change status: Draft → Sent → Converted → Expired
- Delete quotes

---

## 📦 Orders Page (`/orders`)
- Create orders manually or import from a quote
- Visual progress tracker: Pending → In Production → Ready → Delivered
- Revenue stats: Total, Collected, Balance Due
- Update payment (advance paid, balance due)
- Cancel & reactivate orders
- Filter by status

---

## 👥 Customers Page (`/customers`)
- Auto-populated from orders & quotes by email
- Search by name, email, company
- Per-customer stats: spend, balance due, active orders
- Click customer → full order & quote history
- Add customers manually

---

## 👤 Customer Portal (`/customer`)
- Overview with stats + active order progress tracker
- Orders tab with status progress bar
- Quotes tab with full pricing breakdown
- Balance due visibility
- Separate login at `/customer/login`

---

## 🌐 Landing Page (`/` and `/landing`)
- Dark purple theme (#0D0B1A background)
- Font: Plus Jakarta Sans (bold headings), Inter (body)
- Sections: Hero, Stats, Features, How it Works, Pricing, Testimonials, CTA, Footer
- 3 Plans shown: Free, Solo (Coming Soon), Press Pro (Coming Soon)
- Payments badge: Razorpay, GPay, UPI, Cards
- US-facing product positioning

---

## 💰 Planned Pricing Plans

### Free
- 1 user, demo rates only
- 5 quotes/month
- PrintCalc branding

### Solo (price TBD)
- 1 owner + 3 staff
- Custom rates
- Unlimited quotes & orders
- No customer portal

### Press Pro (price TBD)
- 1 owner + 10 staff
- White label (logo + business name)
- Unlimited customers
- Per-customer rate cards
- Customer self-service portal
- Buy credits for more customers

---

## 🚧 Pending / Not Yet Built

### High Priority
1. **Invite Link System** — Printer shares unique link → customer signs up → auto linked to that printer
2. **Per-customer rates** — Each customer has their own rate card (override default rates)
3. **White label portal** — Printer's own branded URL with their logo
4. **Plan selection during signup** — Choose Free/Solo/Press Pro
5. **Razorpay payment integration** — For plan subscriptions
6. **Super Admin panel** — For PrintCalc owner to manage all subscribers

### Medium Priority
7. **Staff accounts** — Printer can add staff who access dashboard
8. **Subdomain routing** — mehtaprinters.printcalc.app
9. **Email notifications** — Quote sent, order status update
10. **PDF improvements** — Better quote PDF with logo

### Future
11. **Annual billing** — 2 months free
12. **Credit system** — Buy more customers
13. **Mobile app**

---

## 🔧 Environment Variables (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## 📝 Important Notes for Developers

1. **Supabase import paths** — Must match folder depth:
   - `app/page.tsx` → `import from './supabase'`
   - `app/quotes/page.tsx` → `import from '../supabase'`
   - `app/customer/page.tsx` → `import from '../supabase'`
   - `app/customer/login/page.tsx` → `import from '../../supabase'`

2. **No Tailwind** — All styling is inline CSS or CSS-in-JSX `<style>` tags

3. **Demo subscriber ID** — `00000000-0000-0000-0000-000000000001` is used for unauthenticated demo calculator

4. **Currency** — Subscriber picks one currency at signup. All calculations use that currency. Cannot mix currencies.

5. **Plate sizes** — Hardcoded in calculator: 15×20", 18×23", 18×25", 20×28", 20×30", 25×36"

6. **Final sizes** — Auto-mapped to plate sizes. Custom size option available.

7. **Brochure/Book** — Pages must be divisible by 4 (minimum 8 pages)

8. **Git workflow** — Windows PowerShell does NOT support `&&`. Run git commands separately:
   ```
   git add .
   git commit -m "message"
   git push
   ```

---

## 🏗️ Architecture Vision (Multi-tenant SaaS)

```
PrintCalc Platform
│
├── printcalc.app (main site)
│   ├── / → Landing page
│   ├── /signup → Printer signup only
│   ├── /login → Printer login only
│   └── /dashboard → Printer dashboard
│
└── [printer-slug].printcalc.app (white label)
    ├── / → Printer's branded calculator
    ├── /signup → Customer signup (auto-linked to printer)
    ├── /login → Customer login
    └── /portal → Customer dashboard
```

**Each printer has:**
- Their own subdomain
- Their own logo & business name
- Their own rates (default + per-customer overrides)
- Their own customers (isolated from other printers)
- Their own quotes & orders

---

## 📞 Project Owner
- **Name:** Harsh Dave
- **GitHub:** harshdave2502
- **Business:** Printing industry SaaS — India based, US-facing product
- **Target Market:** Print shop owners, graphic designers, freelancers, print traders

---
*This document was generated from the full development conversation. Upload this to any AI chat to continue development without re-explaining the project.*
