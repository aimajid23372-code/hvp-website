
-- Fix orders table (add missing columns safely)
ALTER TABLE IF EXISTS public.orders 
ADD COLUMN IF NOT EXISTS customer_name text,
ADD COLUMN IF NOT EXISTS customer_contact text,
ADD COLUMN IF NOT EXISTS course text,
ADD COLUMN IF NOT EXISTS amount numeric,
ADD COLUMN IF NOT EXISTS promo_code text,
ADD COLUMN IF NOT EXISTS affiliate_ref text,
ADD COLUMN IF NOT EXISTS invoice_id text,
ADD COLUMN IF NOT EXISTS our_ref text,
ADD COLUMN IF NOT EXISTS status text,
ADD COLUMN IF NOT EXISTS payment_method text,
ADD COLUMN IF NOT EXISTS transaction_id text;

-- Create wallets table
CREATE TABLE IF NOT EXISTS public.wallets (
  email text PRIMARY KEY,
  balance numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Ensure promo_codes table exists
CREATE TABLE IF NOT EXISTS public.promo_codes (
  code text PRIMARY KEY,
  discount_percent numeric NOT NULL DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

