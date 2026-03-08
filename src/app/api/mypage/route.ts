import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // Single auth call, then all DB queries in parallel (removed duplicate records query)
    const [recordsResult, prefsResult, sharesResult, followingResult, followerResult] = await Promise.all([
      supabase
        .from("tasting_records")
        .select("id, name, distillery, region, type, flavor_tags, rating, note, photo_url, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("user_preferences")
        .select("top_flavors, top_regions, preferred_types, avg_rating, total_tastings")
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("share_logs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("user_follows")
        .select("id", { count: "exact", head: true })
        .eq("follower_id", user.id),
      supabase
        .from("user_follows")
        .select("id", { count: "exact", head: true })
        .eq("following_id", user.id),
    ]);

    // Profile from auth metadata (no DB call needed)
    const profile = {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || "",
      display_name: user.user_metadata?.display_name || "",
      user_handle: user.user_metadata?.user_handle || "",
      bio: user.user_metadata?.bio || "",
      avatar_url: user.user_metadata?.avatar_url || "",
      website: user.user_metadata?.website || "",
      twitter: user.user_metadata?.twitter || "",
      instagram: user.user_metadata?.instagram || "",
    };

    // Compute dashboard stats from records (single-pass aggregation)
    const records = recordsResult.data || [];
    // Records are ordered desc, so recent records are first
    const recentRecordsData = records.slice(0, 3);
    let dashboard = null;

    if (records.length > 0) {
      const ratingDistribution: Record<number, number> = {};
      for (let i = 1; i <= 10; i++) ratingDistribution[i] = 0;

      const flavorCount: Record<string, number> = {};
      const regionCountMap: Record<string, number> = {};
      const regionRating: Record<string, number[]> = {};
      const typeCountMap: Record<string, number> = {};
      const typeRating: Record<string, number[]> = {};
      const monthlyRatings: Record<string, number[]> = {};
      let ratingSum = 0;

      // Single pass over all records
      for (const r of records) {
        ratingDistribution[r.rating]++;
        ratingSum += r.rating;

        for (const tag of (r.flavor_tags || [])) {
          flavorCount[tag] = (flavorCount[tag] || 0) + 1;
        }

        if (r.region) {
          regionCountMap[r.region] = (regionCountMap[r.region] || 0) + 1;
          (regionRating[r.region] ??= []).push(r.rating);
        }

        if (r.type) {
          typeCountMap[r.type] = (typeCountMap[r.type] || 0) + 1;
          (typeRating[r.type] ??= []).push(r.rating);
        }

        const month = r.created_at.substring(0, 7);
        (monthlyRatings[month] ??= []).push(r.rating);
      }

      const topFlavors = Object.entries(flavorCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, count]) => ({ name, count }));

      const regionBreakdown = Object.entries(regionCountMap)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({
          name,
          count,
          avgRating: Math.round((regionRating[name].reduce((a, b) => a + b, 0) / regionRating[name].length) * 10) / 10,
        }));

      const typeBreakdown = Object.entries(typeCountMap)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({
          name,
          count,
          avgRating: Math.round((typeRating[name].reduce((a, b) => a + b, 0) / typeRating[name].length) * 10) / 10,
        }));

      // Records already sorted desc by created_at
      const favorites = records
        .filter((r) => r.rating >= 7)
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 5)
        .map((r) => ({ name: r.name, rating: r.rating, type: r.type, region: r.region }));

      const avgRating = Math.round((ratingSum / records.length) * 10) / 10;

      const ratingTrend = Object.entries(monthlyRatings)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, ratings]) => ({
          month,
          avgRating: Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10,
          count: ratings.length,
        }));

      dashboard = {
        total: records.length,
        avgRating,
        ratingDistribution,
        topFlavors,
        regionBreakdown,
        typeBreakdown,
        favorites,
        ratingTrend,
        aiAnalysis: null,
      };
    }

    // Preferences
    const preferences = prefsResult.data || {
      top_flavors: [],
      top_regions: [],
      preferred_types: [],
      avg_rating: 0,
      total_tastings: 0,
    };

    return NextResponse.json(
      {
        profile,
        dashboard,
        recentRecords: recentRecordsData,
        preferences,
        shareCount: sharesResult.count || 0,
        followingCount: followingResult.count || 0,
        followerCount: followerResult.count || 0,
      },
      { headers: { "Cache-Control": "private, max-age=0, stale-while-revalidate=30" } }
    );
  } catch (error) {
    console.error("MyPage error:", error);
    return NextResponse.json(
      { error: "データの取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
