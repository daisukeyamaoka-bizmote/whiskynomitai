import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET: ユーザーのシェア回数を取得
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { count, error } = await supabase
      .from("share_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ count: 0 });
    }

    return NextResponse.json({ count: count || 0 });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}

// POST: シェアを記録
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { record_id, platform } = await request.json();

    if (!record_id || !platform) {
      return NextResponse.json(
        { error: "record_id と platform が必要です" },
        { status: 400 }
      );
    }

    const validPlatforms = ["x", "line", "native", "download"];
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json(
        { error: "無効な platform です" },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("share_logs").insert({
      user_id: user.id,
      record_id,
      platform,
    });

    if (error) {
      console.error("Share log error:", error);
      return NextResponse.json(
        { error: "シェア記録に失敗しました" },
        { status: 500 }
      );
    }

    // Return updated count
    const { count } = await supabase
      .from("share_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    return NextResponse.json({ success: true, count: count || 0 });
  } catch {
    return NextResponse.json(
      { error: "シェア記録中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
