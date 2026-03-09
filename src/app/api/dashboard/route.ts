import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface TastingRecord {
  name: string;
  distillery: string | null;
  region: string | null;
  type: string | null;
  abv: number | null;
  age: number | null;
  flavor_tags: string[];
  rating: number;
  note: string | null;
  created_at: string;
}

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { data: records, error } = await supabase
      .from("tasting_records")
      .select(
        "name, distillery, region, type, abv, age, flavor_tags, rating, note, created_at"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: "記録の取得に失敗しました" },
        { status: 500 }
      );
    }

    if (!records || records.length === 0) {
      return NextResponse.json({ error: "記録がありません", total: 0 }, { status: 400 });
    }

    const typedRecords = records as TastingRecord[];

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
    const regionCountMap: Record<string, number> = {};
    const regionRating: Record<string, number[]> = {};
    typedRecords.forEach((r) => {
      if (r.region) {
        regionCountMap[r.region] = (regionCountMap[r.region] || 0) + 1;
        if (!regionRating[r.region]) regionRating[r.region] = [];
        regionRating[r.region].push(r.rating);
      }
    });
    const regionBreakdown = Object.entries(regionCountMap)
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
    const typeCountMap: Record<string, number> = {};
    const typeRating: Record<string, number[]> = {};
    typedRecords.forEach((r) => {
      if (r.type) {
        typeCountMap[r.type] = (typeCountMap[r.type] || 0) + 1;
        if (!typeRating[r.type]) typeRating[r.type] = [];
        typeRating[r.type].push(r.rating);
      }
    });
    const typeBreakdown = Object.entries(typeCountMap)
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

    // Favorites
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

    // Return stats immediately — no AI call here
    return NextResponse.json(
      {
        total: typedRecords.length,
        avgRating,
        ratingDistribution,
        topFlavors,
        regionBreakdown,
        typeBreakdown,
        favorites,
        ratingTrend,
        aiAnalysis: null,
      },
      { headers: { "Cache-Control": "private, max-age=0, stale-while-revalidate=60" } }
    );
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json(
      { error: "ダッシュボードデータの取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
