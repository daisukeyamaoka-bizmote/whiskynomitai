import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const POST_SELECT = `
  id,
  comment,
  is_public,
  likes_count,
  comments_count,
  created_at,
  user_id,
  record_id,
  whiskey_name,
  whiskey_distillery,
  whiskey_region,
  whiskey_type,
  whiskey_rating,
  whiskey_photo_url,
  whiskey_flavor_tags,
  whiskey_note
`;

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
    const tab = searchParams.get("tab") || "all";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 20;
    const offset = (page - 1) * limit;

    let query = supabase
      .from("timeline_posts")
      .select(POST_SELECT)
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (tab === "following") {
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

    // Check which posts the current user has liked
    const postIds = (posts || []).map((p) => p.id);
    let likedPostIds = new Set<string>();
    if (postIds.length > 0) {
      const { data: userLikes } = await supabase
        .from("timeline_likes")
        .select("post_id")
        .eq("user_id", user.id)
        .in("post_id", postIds);

      likedPostIds = new Set((userLikes || []).map((l) => l.post_id));
    }

    // Check bookmarks, follows, and names in parallel
    const userIds = [...new Set((posts || []).map((p) => p.user_id))];
    const [followResult, bookmarkResult, ...nameResults] = await Promise.all([
      userIds.length > 0
        ? supabase
            .from("user_follows")
            .select("following_id")
            .eq("follower_id", user.id)
            .in("following_id", userIds)
        : Promise.resolve({ data: [] }),
      postIds.length > 0
        ? supabase
            .from("user_bookmarks")
            .select("post_id")
            .eq("user_id", user.id)
            .in("post_id", postIds)
        : Promise.resolve({ data: [] }),
      // Fetch display names in parallel (all at once)
      ...userIds.map(async (uid) => {
        const { data } = await supabase.rpc("get_user_display_name", { p_user_id: uid });
        return { id: uid, name: data || "ウイスキーファン" };
      }),
    ]);

    const followingSet = new Set((followResult.data || []).map((f: { following_id: string }) => f.following_id));
    const bookmarkedPostIds = new Set((bookmarkResult.data || []).map((b: { post_id: string }) => b.post_id));
    const nameMap = new Map(nameResults.map((n) => [n.id, n.name]));

    // Map to frontend-friendly format
    const enrichedPosts = (posts || []).map((post) => ({
      id: post.id,
      comment: post.comment,
      likes_count: post.likes_count,
      comments_count: post.comments_count,
      created_at: post.created_at,
      user_id: post.user_id,
      user_name: nameMap.get(post.user_id) || "ウイスキーファン",
      is_liked: likedPostIds.has(post.id),
      is_bookmarked: bookmarkedPostIds.has(post.id),
      is_following: followingSet.has(post.user_id),
      is_own: post.user_id === user.id,
      tasting_records: {
        id: post.record_id,
        name: post.whiskey_name,
        distillery: post.whiskey_distillery,
        region: post.whiskey_region,
        type: post.whiskey_type,
        rating: post.whiskey_rating,
        photo_url: post.whiskey_photo_url,
        flavor_tags: post.whiskey_flavor_tags || [],
        note: post.whiskey_note,
      },
    }));

    return NextResponse.json(
      { posts: enrichedPosts, hasMore: (posts || []).length === limit },
      { headers: { "Cache-Control": "private, max-age=0, stale-while-revalidate=30" } }
    );
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

    // Fetch the record (user's own, so RLS allows it)
    const { data: record, error: recordError } = await supabase
      .from("tasting_records")
      .select("id, name, distillery, region, type, rating, photo_url, flavor_tags, note")
      .eq("id", record_id)
      .eq("user_id", user.id)
      .single();

    if (recordError || !record) {
      console.error("Record fetch error:", recordError);
      return NextResponse.json(
        { error: recordError ? `記録の取得に失敗: ${recordError.message}` : "記録が見つかりません" },
        { status: 404 }
      );
    }

    // Save post with whiskey snapshot data
    const { data: post, error } = await supabase
      .from("timeline_posts")
      .insert({
        user_id: user.id,
        record_id,
        comment: comment || null,
        is_public,
        whiskey_name: record.name,
        whiskey_distillery: record.distillery,
        whiskey_region: record.region,
        whiskey_type: record.type,
        whiskey_rating: record.rating,
        whiskey_photo_url: record.photo_url,
        whiskey_flavor_tags: record.flavor_tags || [],
        whiskey_note: record.note,
      })
      .select()
      .single();

    if (error) {
      console.error("Post create error:", error);
      // If snapshot columns don't exist, retry without them
      if (error.code === "42703" || error.message?.includes("column")) {
        const { data: post2, error: error2 } = await supabase
          .from("timeline_posts")
          .insert({
            user_id: user.id,
            record_id,
            comment: comment || null,
            is_public,
          })
          .select()
          .single();

        if (!error2) {
          return NextResponse.json(post2);
        }
        console.error("Post create fallback error:", error2);
        return NextResponse.json(
          { error: `投稿に失敗しました: ${error2.message}` },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: `投稿に失敗しました: ${error.message}` },
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
