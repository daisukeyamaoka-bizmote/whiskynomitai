import { createClient } from "@/lib/supabase/server";
import TimelinePage from "./TimelineClient";

function getUserLevel(recordCount: number): { level: number; title: string } {
  const xp = recordCount * 10;
  const LEVELS = [
    { level: 1, title: "ビギナー", minXp: 0 },
    { level: 2, title: "テイスター", minXp: 30 },
    { level: 3, title: "愛好家", minXp: 80 },
    { level: 4, title: "探究者", minXp: 160 },
    { level: 5, title: "ウイスキー通", minXp: 300 },
    { level: 6, title: "コニサー", minXp: 500 },
    { level: 7, title: "ソムリエ", minXp: 800 },
    { level: 8, title: "マスター", minXp: 1200 },
    { level: 9, title: "グランドマスター", minXp: 1800 },
    { level: 10, title: "レジェンド", minXp: 2500 },
  ];
  let current = LEVELS[0];
  for (const def of LEVELS) {
    if (xp >= def.minXp) current = def;
    else break;
  }
  return { level: current.level, title: current.title };
}

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
  whiskey_note,
  whiskey_drinking_location
`;

export default async function TimelineServerPage() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return <TimelinePage />;
    }

    const limit = 20;

    const { data: posts } = await supabase
      .from("timeline_posts")
      .select(POST_SELECT)
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .range(0, limit - 1);

    if (!posts || posts.length === 0) {
      return <TimelinePage initialPosts={[]} initialHasMore={false} />;
    }

    const postIds = posts.map((p) => p.id);
    const userIds = [...new Set(posts.map((p) => p.user_id))];

    const [likesResult, followResult, bookmarkResult, profilesResult, ...recordCountResults] = await Promise.all([
      supabase
        .from("timeline_likes")
        .select("post_id")
        .eq("user_id", user.id)
        .in("post_id", postIds),
      supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", user.id)
        .in("following_id", userIds),
      supabase
        .from("user_bookmarks")
        .select("post_id")
        .eq("user_id", user.id)
        .in("post_id", postIds),
      supabase
        .from("user_profiles")
        .select("id, display_name, user_handle, avatar_url")
        .in("id", userIds),
      ...userIds.map((uid) =>
        supabase.rpc("get_user_record_count", { p_user_id: uid })
      ),
    ]);

    const likedPostIds = new Set((likesResult.data || []).map((l: { post_id: string }) => l.post_id));
    const followingSet = new Set((followResult.data || []).map((f: { following_id: string }) => f.following_id));
    const bookmarkedPostIds = new Set((bookmarkResult.data || []).map((b: { post_id: string }) => b.post_id));

    const profileMap = new Map<string, { display_name: string; user_handle: string; avatar_url: string }>();
    for (const p of (profilesResult.data || []) as { id: string; display_name: string; user_handle: string; avatar_url: string }[]) {
      profileMap.set(p.id, p);
    }

    const recordCountMap = new Map<string, number>();
    userIds.forEach((uid, i) => {
      recordCountMap.set(uid, (recordCountResults[i] as { data: number | null }).data || 0);
    });

    const enrichedPosts = posts.map((post) => {
      const profile = profileMap.get(post.user_id);
      return {
        id: post.id,
        comment: post.comment,
        likes_count: post.likes_count,
        comments_count: post.comments_count,
        created_at: post.created_at,
        user_id: post.user_id,
        user_name: profile?.display_name || "ウイスキーファン",
        user_handle: profile?.user_handle || "",
        user_avatar_url: profile?.avatar_url || "",
        user_level: getUserLevel(recordCountMap.get(post.user_id) || 0),
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
          drinking_location: post.whiskey_drinking_location || null,
        },
      };
    });

    return <TimelinePage initialPosts={enrichedPosts} initialHasMore={posts.length === limit} />;
  } catch (error) {
    console.error("Server prefetch error:", error);
    return <TimelinePage />;
  }
}
