-- Allow any authenticated user to read all tasting records (social app - profiles are public)
-- Drop the old restrictive select policies
drop policy if exists "tasting_records_select_own" on public.tasting_records;
drop policy if exists "tasting_records_select_public_posts" on public.tasting_records;

-- New policy: any authenticated user can read all records
create policy "tasting_records_select_authenticated" on public.tasting_records
  for select using (auth.role() = 'authenticated');
