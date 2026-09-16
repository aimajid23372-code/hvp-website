-- HVB অ্যাডমিন প্যানেল আপগ্রেড — Supabase SQL Editor-এ একবার চালান।

-- ১) কোর্স / কনটেন্ট টেবিল (দাম, থাম্বনেইল, ড্রাইভ লিংক, প্রম্পট)
create table if not exists public.products (
  slug text primary key,
  title text not null default '',
  price integer not null default 0,
  thumbnail text,
  drive_link text,
  prompt text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;
-- শুধু service role (আমাদের সার্ভার) পড়বে/লিখবে; anon/authenticated-এর কোনো নীতি নেই মানে কোনো অ্যাকসেস নেই।
grant all on public.products to service_role;

-- ২) রিভিউ টেবিলে দ্রুত ফিল্টারের জন্য index
create index if not exists reviews_status_created_idx on public.reviews (status, created_at desc);

-- ৩) অর্ডার তালিকা ও ড্যাশবোর্ডের জন্য index
create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_status_idx on public.orders (status);

-- ৪) শুরুর কোর্সগুলো (দাম অ্যাডমিন থেকে বদলাতে পারবেন)
insert into public.products (slug, title, price, active, sort_order)
values
  ('short', 'Short Video Course', 299, true, 1),
  ('bundle', 'Short + Long Video Course', 650, true, 2),
  ('long', 'Long Video Course', 0, false, 3)
on conflict (slug) do nothing;
