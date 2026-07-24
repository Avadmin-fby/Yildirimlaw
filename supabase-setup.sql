-- YILDIRIM LAW & CONSULTANCY - Supabase CMS kurulumu
-- Supabase SQL Editor içinde tek seferde çalıştırın.

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.admin_users where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title_tr text not null,
  title_en text,
  summary_tr text not null,
  summary_en text,
  content_html text not null,
  content_en_html text,
  category text,
  cover_image_url text,
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  author_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
drop trigger if exists articles_set_updated_at on public.articles;
create trigger articles_set_updated_at before update on public.articles for each row execute function public.set_updated_at();

alter table public.articles enable row level security;
revoke all on public.articles from anon, authenticated;
grant select on public.articles to anon, authenticated;
grant insert, update, delete on public.articles to authenticated;

create policy "public reads published articles" on public.articles
for select to anon using (status='published');
create policy "admins read all articles" on public.articles
for select to authenticated using (public.is_admin());
create policy "admins insert articles" on public.articles
for insert to authenticated with check (public.is_admin() and author_id=auth.uid());
create policy "admins update articles" on public.articles
for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete articles" on public.articles
for delete to authenticated using (public.is_admin());

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('article-images','article-images',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];

create policy "public reads article images" on storage.objects
for select to public using (bucket_id='article-images');
create policy "admins upload article images" on storage.objects
for insert to authenticated with check (bucket_id='article-images' and public.is_admin());
create policy "admins update article images" on storage.objects
for update to authenticated using (bucket_id='article-images' and public.is_admin()) with check (bucket_id='article-images' and public.is_admin());
create policy "admins delete article images" on storage.objects
for delete to authenticated using (bucket_id='article-images' and public.is_admin());

-- ÖNEMLİ: Authentication > Users alanından admin kullanıcısını oluşturduktan sonra
-- aşağıdaki satırdaki UUID'yi o kullanıcının User UID değeriyle değiştirip ayrıca çalıştırın:
-- insert into public.admin_users(user_id) values ('ADMIN_USER_UUID_BURAYA');
