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

    const enriched = (comments || []).map((c) => ({
      ...c,
      user_name: "ウイスキーファン",
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

    const { data: comment, error } = await supabase
      .from("timeline_comments")
      .insert({
        user_id: user.id,
        post_id,
        content: content.trim(),
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

    const userName =
      user.user_metadata?.full_name || "ウイスキーファン";

    return NextResponse.json({
      ...comment,
      user_name: userName,
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
