-- WardrobeAI — Supabase Schema
-- Run these in order in the Supabase SQL editor

-- ── Extensions ──────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Users (extends Supabase auth.users) ─────────────────────────
create table public.users (
                              id uuid references auth.users on delete cascade primary key,
                              email text not null,
                              full_name text not null default '',
                              avatar_url text,
                              style_profile jsonb,
                              created_at timestamp with time zone default timezone('utc', now())
);

-- ── Wardrobe Items ───────────────────────────────────────────────
create table public.wardrobe_items (
                                       id uuid default uuid_generate_v4() primary key,
                                       user_id uuid references public.users on delete cascade not null,
                                       name text not null,
                                       category text not null check (category in ('tops','bottoms','dresses','outerwear','shoes','accessories')),
                                       color text not null,
                                       image_url text not null,
                                       tags text[] default '{}',
                                       times_worn integer default 0,
                                       last_worn timestamp with time zone,
                                       created_at timestamp with time zone default timezone('utc', now())
);

-- ── Outfits ──────────────────────────────────────────────────────
create table public.outfits (
                                id uuid default uuid_generate_v4() primary key,
                                user_id uuid references public.users on delete cascade not null,
                                name text not null,
                                occasion text not null,
                                season text not null,
                                ai_generated boolean default false,
                                rating integer check (rating between 1 and 5),
                                created_at timestamp with time zone default timezone('utc', now())
);

-- ── Outfit Items (join table) ─────────────────────────────────────
create table public.outfit_items (
                                     id uuid default uuid_generate_v4() primary key,
                                     outfit_id uuid references public.outfits on delete cascade not null,
                                     wardrobe_item_id uuid references public.wardrobe_items on delete cascade not null
);

-- ── Row-Level Security (RLS) ─────────────────────────────────────
-- Users can only see and modify their own data

alter table public.users enable row level security;
alter table public.wardrobe_items enable row level security;
alter table public.outfits enable row level security;
alter table public.outfit_items enable row level security;

-- Users
create policy "Users can view own profile" on public.users
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.users
  for update using (auth.uid() = id);

-- Wardrobe Items
create policy "Users can view own items" on public.wardrobe_items
  for select using (auth.uid() = user_id);
create policy "Users can insert own items" on public.wardrobe_items
  for insert with check (auth.uid() = user_id);
create policy "Users can update own items" on public.wardrobe_items
  for update using (auth.uid() = user_id);
create policy "Users can delete own items" on public.wardrobe_items
  for delete using (auth.uid() = user_id);

-- Outfits
create policy "Users can manage own outfits" on public.outfits
  for all using (auth.uid() = user_id);

-- Outfit Items
create policy "Users can manage outfit items" on public.outfit_items
  for all using (
    exists (
      select 1 from public.outfits
      where id = outfit_items.outfit_id
      and user_id = auth.uid()
    )
  );

-- ── Helper Functions ─────────────────────────────────────────────
create or replace function increment_times_worn(item_id uuid)
returns void as $$
update public.wardrobe_items
set times_worn = times_worn + 1,
    last_worn = timezone('utc', now())
where id = item_id and user_id = auth.uid();
$$ language sql security definer;

-- ── Storage Bucket ───────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('wardrobe-images', 'wardrobe-images', true);

create policy "Users can upload own images" on storage.objects
  for insert with check (
    bucket_id = 'wardrobe-images' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Anyone can view wardrobe images" on storage.objects
  for select using (bucket_id = 'wardrobe-images');
