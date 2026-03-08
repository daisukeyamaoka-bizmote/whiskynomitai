import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";

    if (query.length < 1) {
      return NextResponse.json({ users: [] });
    }

    const { data } = await supabase.rpc("search_users_by_handle", {
      p_query: query,
      p_limit: 8,
    });

    return NextResponse.json({ users: data || [] });
  } catch {
    return NextResponse.json({ error: "検索に失敗しました" }, { status: 500 });
  }
}
