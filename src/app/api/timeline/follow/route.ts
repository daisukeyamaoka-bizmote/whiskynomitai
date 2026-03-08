import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { user_id, action } = await request.json();

    if (!user_id || user_id === user.id) {
      return NextResponse.json(
        { error: "無効なユーザーIDです" },
        { status: 400 }
      );
    }

    if (action === "unfollow") {
      await supabase
        .from("user_follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", user_id);
    } else {
      const { error } = await supabase.from("user_follows").insert({
        follower_id: user.id,
        following_id: user_id,
      });

      if (error && error.code !== "23505") {
        return NextResponse.json(
          { error: "フォローに失敗しました" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      is_following: action !== "unfollow",
    });
  } catch (error) {
    console.error("Follow error:", error);
    return NextResponse.json(
      { error: "フォロー処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
