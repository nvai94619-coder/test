-- ЖАШТАР БОРБОРУ МАНАС: БАЗА НОВОСТЕЙ И ЗАКРЫТАЯ АДМИНКА
-- Выполните этот файл один раз в Supabase: SQL Editor -> New query -> Run.

create extension if not exists pgcrypto;

-- Список администраторов. Публичный сайт не может добавлять сюда пользователей.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

drop policy if exists "admin can see own membership" on public.admin_users;
create policy "admin can see own membership"
on public.admin_users for select
to authenticated
using (auth.uid() = user_id);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  title_ky text not null,
  title_ru text not null,
  excerpt_ky text not null default '',
  excerpt_ru text not null default '',
  content_ky text not null,
  content_ru text not null,
  category_ky text not null default 'Жаңылык',
  category_ru text not null default 'Новость',
  image_url text,
  published boolean not null default false,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists news_set_updated_at on public.news;
create trigger news_set_updated_at
before update on public.news
for each row execute function public.set_updated_at();

alter table public.news enable row level security;

drop policy if exists "public reads published news" on public.news;
create policy "public reads published news"
on public.news for select
to anon, authenticated
using ((published = true and published_at <= now()) or public.is_admin());

drop policy if exists "admin inserts news" on public.news;
create policy "admin inserts news"
on public.news for insert
to authenticated
with check (public.is_admin());

drop policy if exists "admin updates news" on public.news;
create policy "admin updates news"
on public.news for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admin deletes news" on public.news;
create policy "admin deletes news"
on public.news for delete
to authenticated
using (public.is_admin());

-- Публичное хранилище обложек новостей. Загружать и удалять файлы может только администратор.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('news-images', 'news-images', true, 6291456, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public reads news images" on storage.objects;
create policy "public reads news images"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'news-images');

drop policy if exists "admin uploads news images" on storage.objects;
create policy "admin uploads news images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'news-images' and public.is_admin());

drop policy if exists "admin updates news images" on storage.objects;
create policy "admin updates news images"
on storage.objects for update
to authenticated
using (bucket_id = 'news-images' and public.is_admin())
with check (bucket_id = 'news-images' and public.is_admin());

drop policy if exists "admin deletes news images" on storage.objects;
create policy "admin deletes news images"
on storage.objects for delete
to authenticated
using (bucket_id = 'news-images' and public.is_admin());

-- ПОСЛЕ СОЗДАНИЯ ВАШЕГО ПОЛЬЗОВАТЕЛЯ В AUTHENTICATION -> USERS:
-- 1. Скопируйте его UUID.
-- 2. Замените UUID ниже и выполните только эту одну строку.
-- insert into public.admin_users (user_id) values ('ВАШ-UUID-СЮДА') on conflict do nothing;
