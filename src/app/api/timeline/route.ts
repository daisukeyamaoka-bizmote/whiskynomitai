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
    const tab = searchParams.get("tab") || "all"; // "all" or "following"
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 20;
    const offset = (page - 1) * limit;

    let query = supabase
      .from("timeline_posts")
      .select(
        `
        id,
        comment,
        is_public,
        likes_count,
        comments_count,
        created_at,
        user_id,
        record_id,
        tasting_records (
          id, name, distillery, region, type, rating, photo_url, flavor_tags, note
        )
      `
      )
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (tab === "following") {
      // Get list of users the current user follows
      const { data: follows } = await supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", user.id);

      const followingIds = follows?.map((f) => f.following_id) || [];

      if (followingIds.length === 0) {
        return NextResponse.json({ posts: [], hasMore: false });
      }

      query = query.in("user_id", followingIds);
    }

    const { data: posts, error } = await query;

    if (error) {
      console.error("Timeline fetch error:", error);
      return NextResponse.json(
        { error: "タイムラインの取得に失敗しました" },
        { status: 500 }
      );
    }

    // Get user display names for posts
    const userIds = [...new Set((posts || []).map((p) => p.user_id))];
    const userNames: Record<string, string> = {};

    for (const uid of userIds) {
      const { data: userData } = await supabase.auth.admin.getUserById(uid);
      userNames[uid] =
        userData?.user?.user_metadata?.full_name || "ウイスキーファン";
    }

    // Check which posts the current user has liked
    const postIds = (posts || []).map((p) => p.id);
    const { data: userLikes } = await supabase
      .from("timeline_likes")
      .select("post_id")
      .eq("user_id", user.id)
      .in("post_id", postIds.length > 0 ? postIds : ["none"]);

    const likedPostIds = new Set(
      (userLikes || []).map((l) => l.post_id)
    );

    // Check which users the current user follows
    const { data: userFollows } = await supabase
      .from("user_follows")
      .select("following_id")
      .eq("follower_id", user.id)
      .in("following_id", userIds.length > 0 ? userIds : ["none"]);

    const followingSet = new Set(
      (userFollows || []).map((f) => f.following_id)
    );

    const enrichedPosts = (posts || []).map((post) => ({
      ...post,
      user_name: userNames[post.user_id] || "ウイスキーファン",
      is_liked: likedPostIds.has(post.id),
      is_following: followingSet.has(post.user_id),
      is_own: post.user_id === user.id,
    }));

    return NextResponse.json({
      posts: enrichedPosts,
      hasMore: (posts || []).length === limit,
    });
  } catch (error) {
    console.error("Timeline error:", error);
    return NextResponse.json(
      { error: "タイムラインの取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

// Create a new timeline post (ウイ活投稿)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { record_id, comment, is_public = true } = await request.json();

    if (!record_id) {
      return NextResponse.json(
        { error: "記録IDが必要です" },
        { status: 400 }
      );
    }

    // Verify the record belongs to the user
    const { data: record } = await supabase
      .from("tasting_records")
      .select("id")
      .eq("id", record_id)
      .eq("user_id", user.id)
      .single();

    if (!record) {
      return NextResponse.json(
        { error: "記録が見つかりません" },
        { status: 404 }
      );
    }

    const { data: post, error } = await supabase
      .from("timeline_posts")
      .insert({
        user_id: user.id,
        record_id,
        comment: comment || null,
        is_public,
      })
      .select()
      .single();

    if (error) {
      console.error("Post create error:", error);
      return NextResponse.json(
        { error: "投稿に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error("Post error:", error);
    return NextResponse.json(
      { error: "投稿中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
