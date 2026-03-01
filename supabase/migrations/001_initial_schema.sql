-- ウイスキーノミタイ: Initial Database Schema

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- 1. whiskey_master テーブル
-- ============================================
create table public.whiskey_master (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_ja text,
  distillery text,
  region text,
  country text,
  type text,
  abv decimal,
  age integer,
  flavor_tags text[] default '{}',
  description text,
  image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS: Everyone can read
alter table public.whiskey_master enable row level security;

create policy "whiskey_master_select_all" on public.whiskey_master
  for select using (true);

-- ============================================
-- 2. tasting_records テーブル
-- ============================================
create table public.tasting_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  whiskey_master_id uuid references public.whiskey_master(id),
  photo_url text,
  name text not null,
  distillery text,
  region text,
  type text,
  abv decimal,
  age integer,
  flavor_tags text[] default '{}',
  description text,
  rating integer not null check (rating >= 1 and rating <= 10),
  note text,
  drinking_location text,
  price integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS: Users can only access their own records
alter table public.tasting_records enable row level security;

create policy "tasting_records_select_own" on public.tasting_records
  for select using (auth.uid() = user_id);

create policy "tasting_records_insert_own" on public.tasting_records
  for insert with check (auth.uid() = user_id);

create policy "tasting_records_update_own" on public.tasting_records
  for update using (auth.uid() = user_id);

create policy "tasting_records_delete_own" on public.tasting_records
  for delete using (auth.uid() = user_id);

-- Indexes
create index idx_tasting_records_user_id on public.tasting_records(user_id);
create index idx_tasting_records_created_at on public.tasting_records(created_at desc);

-- ============================================
-- 3. user_preferences テーブル
-- ============================================
create table public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  top_flavors text[] default '{}',
  top_regions text[] default '{}',
  preferred_types text[] default '{}',
  avg_rating decimal default 0,
  total_tastings integer default 0,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

-- RLS: Users can only access their own preferences
alter table public.user_preferences enable row level security;

create policy "user_preferences_select_own" on public.user_preferences
  for select using (auth.uid() = user_id);

create policy "user_preferences_insert_own" on public.user_preferences
  for insert with check (auth.uid() = user_id);

create policy "user_preferences_update_own" on public.user_preferences
  for update using (auth.uid() = user_id);

-- ============================================
-- 4. updated_at 自動更新トリガー
-- ============================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at_whiskey_master
  before update on public.whiskey_master
  for each row execute function public.handle_updated_at();

create trigger set_updated_at_tasting_records
  before update on public.tasting_records
  for each row execute function public.handle_updated_at();

create trigger set_updated_at_user_preferences
  before update on public.user_preferences
  for each row execute function public.handle_updated_at();

-- ============================================
-- 5. Supabase Storage: whiskey-photos バケット
-- ============================================
insert into storage.buckets (id, name, public)
values ('whiskey-photos', 'whiskey-photos', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload
create policy "whiskey_photos_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'whiskey-photos');

-- Allow anyone to read
create policy "whiskey_photos_select" on storage.objects
  for select using (bucket_id = 'whiskey-photos');

-- Allow users to update their own uploads
create policy "whiskey_photos_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'whiskey-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Allow users to delete their own uploads
create policy "whiskey_photos_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'whiskey-photos' and (storage.foldername(name))[1] = auth.uid()::text);
