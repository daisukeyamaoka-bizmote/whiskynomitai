import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { id: targetUserId } = await params;

    // Fetch target user's display name
    const { data: displayName } = await supabase.rpc("get_user_display_name", {
      p_user_id: targetUserId,
    });

    // Fetch follow counts, follow status, and posts in parallel
    const [
      followingCountResult,
      followerCountResult,
      isFollowingResult,
      postsResult,
      recordCountResult,
    ] = await Promise.all([
      supabase
        .from("user_follows")
        .select("id", { count: "exact", head: true })
        .eq("follower_id", targetUserId),
      supabase
        .from("user_follows")
        .select("id", { count: "exact", head: true })
        .eq("following_id", targetUserId),
      supabase
        .from("user_follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId)
        .maybeSingle(),
      supabase
        .from("timeline_posts")
        .select(
          `id, comment, likes_count, comments_count, created_at, user_id,
           whiskey_name, whiskey_distillery, whiskey_region, whiskey_type,
           whiskey_rating, whiskey_photo_url, whiskey_flavor_tags, whiskey_note`
        )
        .eq("user_id", targetUserId)
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("tasting_records")
        .select("id", { count: "exact", head: true })
        .eq("user_id", targetUserId),
    ]);

    // Check which posts current user has liked/bookmarked
    const postIds = (postsResult.data || []).map((p) => p.id);
    const [likeResult, bookmarkResult] = await Promise.all([
      postIds.length > 0
        ? supabase
            .from("timeline_likes")
            .select("post_id")
            .eq("user_id", user.id)
            .in("post_id", postIds)
        : Promise.resolve({ data: [] }),
      postIds.length > 0
        ? supabase
            .from("user_bookmarks")
            .select("post_id")
            .eq("user_id", user.id)
            .in("post_id", postIds)
        : Promise.resolve({ data: [] }),
    ]);

    const likedPostIds = new Set(
      (likeResult.data || []).map((l: { post_id: string }) => l.post_id)
    );
    const bookmarkedPostIds = new Set(
      (bookmarkResult.data || []).map((b: { post_id: string }) => b.post_id)
    );

    const posts = (postsResult.data || []).map((post) => ({
      id: post.id,
      comment: post.comment,
      likes_count: post.likes_count,
      comments_count: post.comments_count,
      created_at: post.created_at,
      user_id: post.user_id,
      user_name: displayName || "ウイスキーファン",
      is_liked: likedPostIds.has(post.id),
      is_bookmarked: bookmarkedPostIds.has(post.id),
      is_following: !!isFollowingResult.data,
      is_own: post.user_id === user.id,
      tasting_records: {
        id: post.id,
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

    return NextResponse.json({
      id: targetUserId,
      display_name: displayName || "ウイスキーファン",
      is_own: targetUserId === user.id,
      is_following: !!isFollowingResult.data,
      following_count: followingCountResult.count || 0,
      follower_count: followerCountResult.count || 0,
      record_count: recordCountResult.count || 0,
      posts,
    });
  } catch (error) {
    console.error("User profile error:", error);
    return NextResponse.json(
      { error: "ユーザー情報の取得に失敗しました" },
      { status: 500 }
    );
  }
}
