import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "following";
    const targetUserId = searchParams.get("user_id") || user.id;

    let userIds: string[] = [];

    if (type === "following") {
      const { data } = await supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", targetUserId)
        .order("created_at", { ascending: false })
        .limit(100);
      userIds = (data || []).map((f) => f.following_id);
    } else {
      const { data } = await supabase
        .from("user_follows")
        .select("follower_id")
        .eq("following_id", targetUserId)
        .order("created_at", { ascending: false })
        .limit(100);
      userIds = (data || []).map((f) => f.follower_id);
    }

    if (userIds.length === 0) {
      return NextResponse.json({ users: [] });
    }

    // Fetch display names
    const users = await Promise.all(
      userIds.map(async (uid) => {
        const { data } = await supabase.rpc("get_user_display_name", { p_user_id: uid });
        return { id: uid, display_name: data || "ウイスキーファン" };
      })
    );

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Follow list error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}
