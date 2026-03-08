import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const postId = searchParams.get("post_id");

    if (!postId) {
      return NextResponse.json(
        { error: "投稿IDが必要です" },
        { status: 400 }
      );
    }

    const { data: comments, error } = await supabase
      .from("timeline_comments")
      .select("id, content, created_at, user_id")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: "コメントの取得に失敗しました" },
        { status: 500 }
      );
    }

    // Get display names for comment authors
    const commentUserIds = [...new Set((comments || []).map((c) => c.user_id))];
    const nameResults = await Promise.all(
      commentUserIds.map(async (uid) => {
        const { data } = await supabase.rpc("get_user_profile_meta", { p_user_id: uid });
        return { id: uid, name: data?.display_name || "ウイスキーファン", avatar_url: data?.avatar_url || "" };
      })
    );
    const nameMap = new Map(nameResults.map((n) => [n.id, n.name]));
    const avatarMap = new Map(nameResults.map((n) => [n.id, n.avatar_url]));

    const enriched = (comments || []).map((c) => ({
      ...c,
      user_name: nameMap.get(c.user_id) || "ウイスキーファン",
      user_avatar_url: avatarMap.get(c.user_id) || "",
      is_own: c.user_id === user.id,
    }));

    return NextResponse.json({ comments: enriched });
  } catch (error) {
    console.error("Comments fetch error:", error);
    return NextResponse.json(
      { error: "コメントの取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { post_id, content } = await request.json();

    if (!post_id || !content?.trim()) {
      return NextResponse.json(
        { error: "投稿IDとコメント内容が必要です" },
        { status: 400 }
      );
    }

    const trimmedContent = content.trim().slice(0, 500);

    const { data: comment, error } = await supabase
      .from("timeline_comments")
      .insert({
        user_id: user.id,
        post_id,
        content: trimmedContent,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "コメントの投稿に失敗しました" },
        { status: 500 }
      );
    }

    // Increment comments count
    await supabase.rpc("increment_comments", { p_post_id: post_id });

    const { data: meta } = await supabase.rpc("get_user_profile_meta", { p_user_id: user.id });

    return NextResponse.json({
      ...comment,
      user_name: meta?.display_name || "ウイスキーファン",
      user_avatar_url: meta?.avatar_url || "",
      is_own: true,
    });
  } catch (error) {
    console.error("Comment post error:", error);
    return NextResponse.json(
      { error: "コメント投稿中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
