-- オンボーディング: ユーザーの初期好みデータ保存用

-- user_preferencesテーブルにオンボーディングデータカラム追加
alter table public.user_preferences
  add column if not exists onboarding_completed boolean default false,
  add column if not exists onboarding_answers jsonb default '{}';
