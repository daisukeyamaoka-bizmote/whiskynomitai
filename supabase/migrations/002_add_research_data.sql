-- Add research_data column to tasting_records for AI research results
alter table public.tasting_records
  add column if not exists research_data jsonb default null;

-- Add comment
comment on column public.tasting_records.research_data is 'AI調査結果（蒸留所の歴史、製造方法、おすすめのつまみなど）';
