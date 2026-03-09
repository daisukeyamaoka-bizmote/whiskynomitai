import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface TastingRecord {
  name: string;
  distillery: string | null;
  region: string | null;
  type: string | null;
  flavor_tags: string[];
  rating: number;
  photo_url: string | null;
  created_at: string;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetUserId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // Fetch target user's tasting records
    const { data: records, error } = await supabase
      .from("tasting_records")
      .select(
        "name, distillery, region, type, flavor_tags, rating, photo_url, created_at"
      )
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: "記録の取得に失敗しました" },
        { status: 500 }
      );
    }

    const typedRecords = (records || []) as TastingRecord[];

    if (typedRecords.length === 0) {
      return NextResponse.json({ total: 0 });
    }

    // Rating distribution
    const ratingDistribution: Record<number, number> = {};
    for (let i = 1; i <= 10; i++) ratingDistribution[i] = 0;
    typedRecords.forEach((r) => ratingDistribution[r.rating]++);

    // Flavor frequency
    const flavorCount: Record<string, number> = {};
    typedRecords.forEach((r) =>
      (r.flavor_tags || []).forEach((tag) => {
        flavorCount[tag] = (flavorCount[tag] || 0) + 1;
      })
    );
    const topFlavors = Object.entries(flavorCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));

    // Region breakdown
    const regionCount: Record<string, number> = {};
    const regionRating: Record<string, number[]> = {};
    typedRecords.forEach((r) => {
      if (r.region) {
        regionCount[r.region] = (regionCount[r.region] || 0) + 1;
        if (!regionRating[r.region]) regionRating[r.region] = [];
        regionRating[r.region].push(r.rating);
      }
    });
    const regionBreakdown = Object.entries(regionCount)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({
        name,
        count,
        avgRating:
          Math.round(
            (regionRating[name].reduce((a, b) => a + b, 0) /
              regionRating[name].length) *
              10
          ) / 10,
      }));

    // Type breakdown
    const typeCount: Record<string, number> = {};
    const typeRating: Record<string, number[]> = {};
    typedRecords.forEach((r) => {
      if (r.type) {
        typeCount[r.type] = (typeCount[r.type] || 0) + 1;
        if (!typeRating[r.type]) typeRating[r.type] = [];
        typeRating[r.type].push(r.rating);
      }
    });
    const typeBreakdown = Object.entries(typeCount)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({
        name,
        count,
        avgRating:
          Math.round(
            (typeRating[name].reduce((a, b) => a + b, 0) /
              typeRating[name].length) *
              10
          ) / 10,
      }));

    // High-rated favorites
    const favorites = typedRecords
      .filter((r) => r.rating >= 7)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 5)
      .map((r) => ({
        name: r.name,
        rating: r.rating,
        type: r.type,
        region: r.region,
      }));

    // Average rating
    const avgRating =
      Math.round(
        (typedRecords.reduce((sum, r) => sum + r.rating, 0) /
          typedRecords.length) *
          10
      ) / 10;

    // Rating trend
    const monthlyRatings: Record<string, number[]> = {};
    typedRecords.forEach((r) => {
      const month = r.created_at.substring(0, 7);
      if (!monthlyRatings[month]) monthlyRatings[month] = [];
      monthlyRatings[month].push(r.rating);
    });
    const ratingTrend = Object.entries(monthlyRatings)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, ratings]) => ({
        month,
        avgRating:
          Math.round(
            (ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10
          ) / 10,
        count: ratings.length,
      }));

    // Recent records (latest 3)
    const recentRecords = [...typedRecords]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, 3)
      .map((r) => ({
        name: r.name,
        rating: r.rating,
        type: r.type,
        region: r.region,
        photo_url: r.photo_url,
        created_at: r.created_at,
      }));

    // Level/XP calculation
    const uniqueFlavors = new Set(
      typedRecords.flatMap((r) => r.flavor_tags || [])
    ).size;
    const uniqueRegions = regionBreakdown.length;
    const uniqueTypes = typeBreakdown.length;
    const highRatedCount = typedRecords.filter((r) => r.rating >= 8).length;

    // Fetch share count
    const { count: shareCount } = await supabase
      .from("timeline_posts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", targetUserId);

    const xp =
      typedRecords.length * 10 +
      uniqueRegions * 20 +
      uniqueTypes * 20 +
      uniqueFlavors * 5 +
      highRatedCount * 5 +
      (shareCount || 0) * 15;

    // Preferences (top flavors & regions)
    const topPreferredFlavors = Object.entries(flavorCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);
    const topPreferredRegions = Object.entries(regionCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);

    return NextResponse.json({
      total: typedRecords.length,
      avgRating,
      ratingDistribution,
      topFlavors,
      regionBreakdown,
      typeBreakdown,
      favorites,
      ratingTrend,
      recentRecords,
      xp,
      preferences: {
        top_flavors: topPreferredFlavors,
        top_regions: topPreferredRegions,
      },
    });
  } catch (error) {
    console.error("User dashboard error:", error);
    return NextResponse.json(
      { error: "データの取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
