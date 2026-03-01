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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const region = searchParams.get("region") || "";
    const type = searchParams.get("type") || "";
    const minRating = searchParams.get("minRating") || "";
    const sort = searchParams.get("sort") || "created_at";
    const order = searchParams.get("order") || "desc";

    let query = supabase
      .from("tasting_records")
      .select("*", { count: "exact" })
      .eq("user_id", user.id);

    if (search) {
      query = query.or(`name.ilike.%${search}%,distillery.ilike.%${search}%`);
    }
    if (region) {
      query = query.eq("region", region);
    }
    if (type) {
      query = query.eq("type", type);
    }
    if (minRating) {
      query = query.gte("rating", parseInt(minRating));
    }

    query = query
      .order(sort, { ascending: order === "asc" })
      .range((page - 1) * limit, page * limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Records fetch error:", error);
      return NextResponse.json(
        { error: "記録の取得に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      records: data,
      total: count,
      page,
      limit,
    });
  } catch (error) {
    console.error("Records error:", error);
    return NextResponse.json(
      { error: "記録の取得中にエラーが発生しました" },
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

    const body = await request.json();

    const { data, error } = await supabase
      .from("tasting_records")
      .insert({
        user_id: user.id,
        photo_url: body.photo_url,
        name: body.name,
        distillery: body.distillery,
        region: body.region,
        type: body.type,
        abv: body.abv,
        age: body.age,
        flavor_tags: body.flavor_tags || [],
        description: body.description,
        rating: body.rating,
        note: body.note,
        drinking_location: body.drinking_location,
        price: body.price,
      })
      .select()
      .single();

    if (error) {
      console.error("Record insert error:", error);
      return NextResponse.json(
        { error: "記録の保存に失敗しました" },
        { status: 500 }
      );
    }

    // Refresh preferences in background
    refreshPreferences(supabase, user.id).catch(console.error);

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Record create error:", error);
    return NextResponse.json(
      { error: "記録の保存中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function refreshPreferences(supabase: any, userId: string) {
  const { data: records } = await supabase
    .from("tasting_records")
    .select("rating, flavor_tags, region, type")
    .eq("user_id", userId);

  if (!records || records.length === 0) return;

  const flavorCount: Record<string, number> = {};
  const regionCount: Record<string, number> = {};
  const typeCount: Record<string, number> = {};
  let totalRating = 0;

  for (const record of records) {
    totalRating += record.rating;
    if (record.flavor_tags) {
      for (const tag of record.flavor_tags) {
        flavorCount[tag] = (flavorCount[tag] || 0) + 1;
      }
    }
    if (record.region) {
      regionCount[record.region] = (regionCount[record.region] || 0) + 1;
    }
    if (record.type) {
      typeCount[record.type] = (typeCount[record.type] || 0) + 1;
    }
  }

  const topFlavors = Object.entries(flavorCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag);

  const topRegions = Object.entries(regionCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([region]) => region);

  const preferredTypes = Object.entries(typeCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type]) => type);

  const avgRating = totalRating / records.length;

  await supabase.from("user_preferences").upsert(
    {
      user_id: userId,
      top_flavors: topFlavors,
      top_regions: topRegions,
      preferred_types: preferredTypes,
      avg_rating: Math.round(avgRating * 10) / 10,
      total_tastings: records.length,
    },
    { onConflict: "user_id" }
  );
}
