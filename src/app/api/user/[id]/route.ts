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

    // Build taste profile from target user's posts
    const targetPosts = postsResult.data || [];
    const buildTasteProfile = (posts: { whiskey_flavor_tags?: string[] | null; whiskey_region?: string | null; whiskey_type?: string | null; whiskey_rating?: number | null }[]) => {
      const flavorCount: Record<string, number> = {};
      const regionCount: Record<string, number> = {};
      const typeCount: Record<string, number> = {};
      let ratingSum = 0;
      let ratingN = 0;

      for (const p of posts) {
        if (p.whiskey_flavor_tags && Array.isArray(p.whiskey_flavor_tags)) {
          for (const tag of p.whiskey_flavor_tags) {
            flavorCount[tag] = (flavorCount[tag] || 0) + 1;
          }
        }
        if (p.whiskey_region) {
          regionCount[p.whiskey_region] = (regionCount[p.whiskey_region] || 0) + 1;
        }
        if (p.whiskey_type) {
          typeCount[p.whiskey_type] = (typeCount[p.whiskey_type] || 0) + 1;
        }
        if (p.whiskey_rating != null) {
          ratingSum += p.whiskey_rating;
          ratingN++;
        }
      }

      const sortedEntries = (obj: Record<string, number>) =>
        Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k);

      return {
        top_flavors: sortedEntries(flavorCount),
        top_regions: sortedEntries(regionCount),
        top_types: sortedEntries(typeCount),
        avg_rating: ratingN > 0 ? Math.round((ratingSum / ratingN) * 10) / 10 : null,
        total_records: posts.length,
        _flavorCount: flavorCount,
        _regionCount: regionCount,
        _typeCount: typeCount,
      };
    };

    const targetTaste = buildTasteProfile(targetPosts);

    // Fetch current user's posts for compatibility calculation
    const { data: myPosts } = await supabase
      .from("timeline_posts")
      .select("whiskey_flavor_tags, whiskey_region, whiskey_type, whiskey_rating")
      .eq("user_id", user.id)
      .limit(50);

    const myTaste = buildTasteProfile(myPosts || []);

    // Calculate compatibility score (0-100)
    const calcCompatibility = () => {
      if (targetTaste.total_records === 0 || (myPosts || []).length === 0) return null;

      // Jaccard-like similarity for flavors, regions, types
      const setOverlap = (a: string[], b: string[]) => {
        const setA = new Set(a);
        const setB = new Set(b);
        const intersection = [...setA].filter((x) => setB.has(x)).length;
        const union = new Set([...setA, ...setB]).size;
        return union > 0 ? intersection / union : 0;
      };

      // Weighted similarity for counted items
      const countedOverlap = (a: Record<string, number>, b: Record<string, number>) => {
        const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
        if (keys.size === 0) return 0;
        let dotProduct = 0;
        let magA = 0;
        let magB = 0;
        for (const k of keys) {
          const va = a[k] || 0;
          const vb = b[k] || 0;
          dotProduct += va * vb;
          magA += va * va;
          magB += vb * vb;
        }
        const denom = Math.sqrt(magA) * Math.sqrt(magB);
        return denom > 0 ? dotProduct / denom : 0;
      };

      const flavorSim = countedOverlap(targetTaste._flavorCount, myTaste._flavorCount);
      const regionSim = countedOverlap(targetTaste._regionCount, myTaste._regionCount);
      const typeSim = countedOverlap(targetTaste._typeCount, myTaste._typeCount);

      // Rating similarity (closer avg = higher score)
      let ratingSim = 0;
      if (targetTaste.avg_rating != null && myTaste.avg_rating != null) {
        ratingSim = 1 - Math.abs(targetTaste.avg_rating - myTaste.avg_rating) / 10;
      }

      // Weighted average: flavors 40%, type 25%, region 20%, rating 15%
      const score = flavorSim * 0.4 + typeSim * 0.25 + regionSim * 0.2 + ratingSim * 0.15;
      return Math.round(score * 100);
    };

    const compatibility = calcCompatibility();

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
      taste_profile: {
        top_flavors: targetTaste.top_flavors,
        top_regions: targetTaste.top_regions,
        top_types: targetTaste.top_types,
        avg_rating: targetTaste.avg_rating,
      },
      compatibility,
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
