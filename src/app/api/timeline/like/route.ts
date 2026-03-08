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

    const { post_id, action } = await request.json();

    if (!post_id) {
      return NextResponse.json(
        { error: "投稿IDが必要です" },
        { status: 400 }
      );
    }

    if (action === "unlike") {
      await supabase
        .from("timeline_likes")
        .delete()
        .eq("user_id", user.id)
        .eq("post_id", post_id);

      // Decrement likes count
      await supabase.rpc("decrement_likes", { p_post_id: post_id });
    } else {
      const { error } = await supabase.from("timeline_likes").insert({
        user_id: user.id,
        post_id,
      });

      if (error && error.code !== "23505") {
        // 23505 = unique violation (already liked)
        return NextResponse.json(
          { error: "いいねに失敗しました" },
          { status: 500 }
        );
      }

      // Increment likes count
      await supabase.rpc("increment_likes", { p_post_id: post_id });
    }

    // Get updated count
    const { data: post } = await supabase
      .from("timeline_posts")
      .select("likes_count")
      .eq("id", post_id)
      .single();

    return NextResponse.json({
      likes_count: post?.likes_count || 0,
      is_liked: action !== "unlike",
    });
  } catch (error) {
    console.error("Like error:", error);
    return NextResponse.json(
      { error: "いいね処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
