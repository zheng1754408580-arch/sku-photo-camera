import { createClient } from "./supabase";
import type { AccessStatus, UserAccess } from "@/types";

/**
 * 获取指定状态的申请列表
 */
export async function getAccessRequests(
  status?: AccessStatus,
): Promise<UserAccess[]> {
  const supabase = createClient();

  let query = supabase
    .from("user_access")
    .select("*")
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch access requests:", error.message);
    return [];
  }

  return (data as UserAccess[]) ?? [];
}

/**
 * 批准用户申请
 */
export async function approveUser(
  accessId: string,
): Promise<{ success: boolean; error?: string }> {
  return updateStatus(accessId, "approved");
}

/**
 * 拒绝用户申请
 */
export async function rejectUser(
  accessId: string,
): Promise<{ success: boolean; error?: string }> {
  return updateStatus(accessId, "rejected");
}

async function updateStatus(
  accessId: string,
  status: AccessStatus,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not signed in." };
  }

  const { error } = await supabase
    .from("user_access")
    .update({
      status,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", accessId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
