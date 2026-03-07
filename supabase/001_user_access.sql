-- ============================================================
-- SKU Photo Naming App — user_access 表 + RLS 策略
-- 在 Supabase Dashboard → SQL Editor 中执行此脚本
-- ============================================================

-- 1. 创建 user_access 表
create table if not exists public.user_access (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  email         text not null,
  display_name  text,
  reason        text,
  status        text not null default 'pending'
                  check (status in ('pending', 'approved', 'rejected')),
  reviewed_by   uuid references auth.users(id),
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 唯一约束：每个用户只能有一条申请记录
create unique index if not exists user_access_user_id_unique on public.user_access(user_id);

-- 索引：按 status 快速筛选
create index if not exists user_access_status_idx on public.user_access(status);

-- 2. 自动更新 updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at on public.user_access;
create trigger set_updated_at
  before update on public.user_access
  for each row
  execute function public.handle_updated_at();

-- 3. 启用 RLS
alter table public.user_access enable row level security;

-- 4. RLS 策略

-- 4a. 用户可以查看自己的记录
create policy "Users can view own access request"
  on public.user_access
  for select
  using (auth.uid() = user_id);

-- 4b. 用户可以插入自己的申请
create policy "Users can insert own access request"
  on public.user_access
  for insert
  with check (auth.uid() = user_id);

-- 4c. 管理员可以查看所有记录
create policy "Admins can view all access requests"
  on public.user_access
  for select
  using (
    coalesce(
      (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean,
      false
    ) = true
  );

-- 4d. 管理员可以更新任何记录（审批/拒绝）
create policy "Admins can update all access requests"
  on public.user_access
  for update
  using (
    coalesce(
      (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean,
      false
    ) = true
  );

-- 4e. 管理员可以删除记录
create policy "Admins can delete access requests"
  on public.user_access
  for delete
  using (
    coalesce(
      (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean,
      false
    ) = true
  );
