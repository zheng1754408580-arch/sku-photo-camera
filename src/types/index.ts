export type AccessStatus = "pending" | "approved" | "rejected";

export interface UserAccess {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  reason: string | null;
  status: AccessStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserAccessInsert {
  email: string;
  display_name?: string;
  reason?: string;
}

export interface UserAccessUpdate {
  status: AccessStatus;
  reviewed_by?: string;
  reviewed_at?: string;
}

export interface UserMetadata {
  is_admin?: boolean;
  display_name?: string;
}
