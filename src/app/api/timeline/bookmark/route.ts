import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET: ユーザーのブックマーク一覧（ツギノムリスト）
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { data: bookmarks, error } = await supabase
      .from("user_bookmarks")
      .select("id, post_id, whiskey_name, whiskey_distillery, whiskey_region, whiskey_type, whiskey_rating, whiskey_photo_url, whiskey_flavor_tags, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Bookmarks fetch error:", error);
      return NextResponse.json(
        { error: "ブックマークの取得に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { bookmarks: bookmarks || [] },
      { headers: { "Cache-Control": "private, max-age=0, stale-while-revalidate=30" } }
    );
  } catch (error) {
    console.error("Bookmarks error:", error);
    return NextResponse.json(
      { error: "ブックマーク取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

// POST: ブックマーク追加/削除
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { post_id, action, whiskey } = await request.json();

    if (!post_id) {
      return NextResponse.json(
        { error: "投稿IDが必要です" },
        { status: 400 }
      );
    }

    if (action === "unbookmark") {
      await supabase
        .from("user_bookmarks")
        .delete()
        .eq("user_id", user.id)
        .eq("post_id", post_id);

      return NextResponse.json({ is_bookmarked: false });
    }

    // Bookmark (add)
    const { error } = await supabase.from("user_bookmarks").insert({
      user_id: user.id,
      post_id,
      whiskey_name: whiskey?.name || "",
      whiskey_distillery: whiskey?.distillery || null,
      whiskey_region: whiskey?.region || null,
      whiskey_type: whiskey?.type || null,
      whiskey_rating: whiskey?.rating || null,
      whiskey_photo_url: whiskey?.photo_url || null,
      whiskey_flavor_tags: whiskey?.flavor_tags || [],
    });

    if (error && error.code !== "23505") {
      console.error("Bookmark insert error:", error);
      return NextResponse.json(
        { error: "ブックマークに失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ is_bookmarked: true });
  } catch (error) {
    console.error("Bookmark error:", error);
    return NextResponse.json(
      { error: "ブックマーク処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
