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

    const { data, error } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error) {
      // No preferences yet
      return NextResponse.json({
        top_flavors: [],
        top_regions: [],
        preferred_types: [],
        avg_rating: 0,
        total_tastings: 0,
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Preferences error:", error);
    return NextResponse.json(
      { error: "好み情報の取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
