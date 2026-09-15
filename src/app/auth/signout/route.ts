import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { recordAuditLog } from "@/lib/auth/audit";

/**
 * Sign the user out. POST only (never sign out on a GET / prefetch).
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await recordAuditLog({
      action: "LOGOUT",
      entityType: "auth",
      entityId: user.id,
      description: "User signed out",
    });
  }

  await supabase.auth.signOut();

  return NextResponse.redirect(new URL("/login", request.url), {
    status: 303,
  });
}
