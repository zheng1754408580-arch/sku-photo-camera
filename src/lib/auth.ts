import { createClient } from "./supabase";
import type { AccessStatus, UserAccess } from "@/types";

export interface SignUpData {
  email: string;
  password: string;
  displayName: string;
  reason?: string;
}

export interface AuthResult {
  success: boolean;
  error?: string;
  redirectTo?: string;
}

/**
 * 注册新用户并创建 pending 申请记录
 */
export async function signUp(data: SignUpData): Promise<AuthResult> {
  const supabase = createClient();

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: { display_name: data.displayName },
    },
  });

  if (authError) {
    return { success: false, error: mapAuthError(authError.message) };
  }

  if (!authData.user) {
    return { success: false, error: "Sign-up failed. Please try again shortly." };
  }

  const { error: rpcError } = await supabase.rpc("create_access_request", {
    p_user_id: authData.user.id,
    p_email: data.email,
    p_display_name: data.displayName,
    p_reason: data.reason || null,
  });

  if (rpcError) {
    console.error("Failed to create access request:", rpcError.message);
  }

  return { success: true, redirectTo: "/pending" };
}

/**
 * 登录并根据 user_access.status 返回跳转目标
 */
export async function signIn(
  email: string,
  password: string,
): Promise<AuthResult> {
  const supabase = createClient();

  const { error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    return { success: false, error: mapAuthError(authError.message) };
  }

  const redirectTo = await getRedirectByStatus();
  return { success: true, redirectTo };
}

/**
 * 根据当前用户的 user_access.status 决定跳转页面
 */
export async function getRedirectByStatus(): Promise<string> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return "/login";

  const isAdmin =
    (user.user_metadata as { is_admin?: boolean })?.is_admin === true;
  if (isAdmin) return "/app";

  const { data } = await supabase
    .from("user_access")
    .select("status")
    .eq("user_id", user.id)
    .single();

  if (!data) return "/pending";

  const status = data.status as AccessStatus;
  switch (status) {
    case "approved":
      return "/app";
    case "rejected":
      return "/rejected";
    case "pending":
    default:
      return "/pending";
  }
}

/**
 * 获取当前用户的访问申请记录
 */
export async function getMyAccessRequest(): Promise<UserAccess | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("user_access")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return (data as UserAccess) ?? null;
}

/**
 * 登出
 */
export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
}

function mapAuthError(message: string): string {
  if (message.includes("Invalid login credentials")) {
    return "Incorrect email or password.";
  }
  if (message.includes("Email not confirmed")) {
    return "Your email is not verified yet. Please check your inbox.";
  }
  if (message.includes("User already registered")) {
    return "This email is already registered. Please sign in instead.";
  }
  if (message.includes("Password should be at least")) {
    return "Your password must be at least 6 characters.";
  }
  if (message.includes("rate limit")) {
    return "Too many attempts. Please try again later.";
  }
  return message;
}
