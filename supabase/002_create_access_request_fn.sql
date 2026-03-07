-- ============================================================
-- 修复：创建 SECURITY DEFINER 函数绕过 RLS 插入 user_access
-- 在 Supabase Dashboard → SQL Editor 中执行此脚本
-- ============================================================

create or replace function public.create_access_request(
  p_user_id uuid,
  p_email text,
  p_display_name text default null,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_access (user_id, email, display_name, reason, status)
  values (p_user_id, p_email, p_display_name, p_reason, 'pending')
  on conflict (user_id) do nothing;
end;
$$;
