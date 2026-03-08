import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkAiUsage } from "@/lib/ai-usage";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const status = await checkAiUsage(supabase, user.id);
    return NextResponse.json(status);
  } catch {
    return NextResponse.json(
      { error: "AI利用状況の取得に失敗しました" },
      { status: 500 }
    );
  }
}
