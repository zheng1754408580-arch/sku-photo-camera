import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/", "/login", "/register", "/request-access"];
const STATUS_ROUTES = ["/pending", "/rejected", "/forbidden"];

function redirect(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_ROUTES.includes(pathname);
  const isStatusPage = STATUS_ROUTES.includes(pathname);
  const isAppRoute = pathname.startsWith("/app");
  const isAdminRoute = pathname.startsWith("/admin");

  // ── 未登录 ──
  if (!user) {
    if (isPublic) return supabaseResponse;
    return redirect(request, "/login");
  }

  // ── 已登录：获取用户角色和状态 ──
  const isAdmin =
    (user.user_metadata as { is_admin?: boolean })?.is_admin === true;

  // 已登录访问 login/register → 重定向到对应页面
  if (pathname === "/login" || pathname === "/register") {
    if (isAdmin) return redirect(request, "/app");

    const status = await getUserStatus(supabase, user.id);
    return redirect(request, statusToPath(status));
  }

  // ── /admin/* 路由：管理员校验 ──
  if (isAdminRoute) {
    if (!isAdmin) return redirect(request, "/forbidden");
    return supabaseResponse;
  }

  // ── /app/* 路由：审批状态校验 ──
  if (isAppRoute) {
    if (isAdmin) return supabaseResponse;

    const status = await getUserStatus(supabase, user.id);
    if (status === "approved") return supabaseResponse;
    return redirect(request, statusToPath(status));
  }

  // ── 状态页面（/pending, /rejected）：防止 approved 用户滞留 ──
  if (isStatusPage) {
    if (isAdmin) return redirect(request, "/app");

    const status = await getUserStatus(supabase, user.id);
    const target = statusToPath(status);
    if (target !== pathname) return redirect(request, target);
    return supabaseResponse;
  }

  return supabaseResponse;
}

async function getUserStatus(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
): Promise<string> {
  const { data } = await supabase
    .from("user_access")
    .select("status")
    .eq("user_id", userId)
    .single();
  return (data?.status as string) ?? "pending";
}

function statusToPath(status: string): string {
  switch (status) {
    case "approved":
      return "/app";
    case "rejected":
      return "/rejected";
    default:
      return "/pending";
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
