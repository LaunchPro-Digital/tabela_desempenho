// Supabase Edge Function: manage-user
// Replaces the PostgreSQL manage_user RPC for Supabase Cloud compatibility.
// Uses GoTrue Admin API instead of direct INSERT into auth.users.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ManageUserRequest {
  action: "create" | "delete" | "reset_password";
  user_email?: string;
  user_name?: string;
  user_role?: string;
  user_role_title?: string;
  user_avatar?: string;
  user_metrics?: unknown;
  target_user_id?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Admin client (service_role — full access)
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify caller is authenticated and is a PARTNER
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse(
        { success: false, error: "Missing authorization header" },
        401
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user: caller },
      error: authError,
    } = await adminClient.auth.getUser(token);

    if (authError || !caller) {
      return jsonResponse(
        { success: false, error: "Invalid or expired token" },
        401
      );
    }

    // Check caller is a PARTNER in app_users
    const { data: callerProfile } = await adminClient
      .from("app_users")
      .select("role")
      .eq("auth_id", caller.id)
      .single();

    if (!callerProfile || callerProfile.role !== "PARTNER") {
      return jsonResponse(
        {
          success: false,
          error: "Unauthorized: only PARTNERs can manage users",
        },
        403
      );
    }

    const body: ManageUserRequest = await req.json();
    const { action } = body;

    switch (action) {
      case "create":
        return await handleCreate(adminClient, body);
      case "delete":
        return await handleDelete(adminClient, body);
      case "reset_password":
        return await handleResetPassword(adminClient, body);
      default:
        return jsonResponse(
          { success: false, error: `Invalid action: ${action}` },
          400
        );
    }
  } catch (err) {
    return jsonResponse(
      { success: false, error: (err as Error).message },
      500
    );
  }
});

// ─── Action Handlers ──────────────────────────────────────────────────────

async function handleCreate(
  adminClient: ReturnType<typeof createClient>,
  body: ManageUserRequest
) {
  const { user_email, user_name, user_role, user_role_title, user_avatar, user_metrics } = body;

  if (!user_email || !user_name) {
    return jsonResponse(
      { success: false, error: "user_email and user_name are required" },
      400
    );
  }

  // 1. Create auth user via GoTrue Admin API
  const { data: authData, error: createError } =
    await adminClient.auth.admin.createUser({
      email: user_email,
      password: "ordus2025",
      email_confirm: true,
      user_metadata: { name: user_name },
    });

  if (createError) {
    return jsonResponse({ success: false, error: createError.message }, 400);
  }

  const authUser = authData.user;
  const newUserId = authUser.id;

  // 2. Insert into app_users
  const { error: insertError } = await adminClient.from("app_users").insert({
    id: newUserId,
    name: user_name,
    role: user_role || "CONTRIBUTOR",
    role_title: user_role_title || "",
    avatar:
      user_avatar ||
      `https://api.dicebear.com/7.x/initials/svg?seed=${user_name}`,
    metrics: user_metrics || [],
    auth_id: authUser.id,
    email: user_email,
    password_changed: false,
  });

  if (insertError) {
    // Rollback: delete the auth user we just created
    await adminClient.auth.admin.deleteUser(authUser.id);
    return jsonResponse({ success: false, error: insertError.message }, 500);
  }

  return jsonResponse({
    success: true,
    user_id: newUserId,
    auth_id: authUser.id,
  });
}

async function handleDelete(
  adminClient: ReturnType<typeof createClient>,
  body: ManageUserRequest
) {
  const { target_user_id } = body;

  if (!target_user_id) {
    return jsonResponse(
      { success: false, error: "target_user_id is required" },
      400
    );
  }

  // Look up auth_id from app_users
  const { data: targetUser } = await adminClient
    .from("app_users")
    .select("auth_id")
    .eq("id", target_user_id)
    .single();

  // Delete auth user if exists
  if (targetUser?.auth_id) {
    const { error: deleteAuthError } =
      await adminClient.auth.admin.deleteUser(targetUser.auth_id);
    if (deleteAuthError) {
      return jsonResponse(
        { success: false, error: deleteAuthError.message },
        500
      );
    }
  }

  // Delete app_user
  const { error: deleteError } = await adminClient
    .from("app_users")
    .delete()
    .eq("id", target_user_id);

  if (deleteError) {
    return jsonResponse({ success: false, error: deleteError.message }, 500);
  }

  return jsonResponse({ success: true });
}

async function handleResetPassword(
  adminClient: ReturnType<typeof createClient>,
  body: ManageUserRequest
) {
  const { target_user_id } = body;

  if (!target_user_id) {
    return jsonResponse(
      { success: false, error: "target_user_id is required" },
      400
    );
  }

  // Look up auth_id
  const { data: targetUser } = await adminClient
    .from("app_users")
    .select("auth_id")
    .eq("id", target_user_id)
    .single();

  if (!targetUser?.auth_id) {
    return jsonResponse(
      { success: false, error: "User has no auth account" },
      404
    );
  }

  // Reset password via Admin API
  const { error: updateError } =
    await adminClient.auth.admin.updateUserById(targetUser.auth_id, {
      password: "ordus2025",
    });

  if (updateError) {
    return jsonResponse({ success: false, error: updateError.message }, 500);
  }

  // Mark password_changed = false
  await adminClient
    .from("app_users")
    .update({ password_changed: false })
    .eq("id", target_user_id);

  return jsonResponse({ success: true });
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
