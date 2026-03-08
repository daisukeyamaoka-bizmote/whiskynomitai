import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { personality_title, personality_description, strength, tendency, top_flavors } =
      await request.json();

    if (!personality_title) {
      return NextResponse.json(
        { error: "分析結果が必要です" },
        { status: 400 }
      );
    }

    const comment = [
      `🥃 AIマイスター分析結果`,
      ``,
      `【${personality_title}】`,
      personality_description,
      ``,
      `💪 ${strength}`,
      tendency ? `📊 ${tendency}` : "",
      top_flavors?.length > 0
        ? `🏷️ ${top_flavors.map((f: string) => `#${f}`).join(" ")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    // Create timeline post without a record_id (AI analysis share)
    const { data: post, error } = await supabase
      .from("timeline_posts")
      .insert({
        user_id: user.id,
        record_id: null,
        comment,
        is_public: true,
        whiskey_name: `AIマイスター分析: ${personality_title}`,
        whiskey_rating: null,
        whiskey_flavor_tags: top_flavors || [],
      })
      .select()
      .single();

    if (error) {
      console.error("AI share post error:", error);
      return NextResponse.json(
        { error: `投稿に失敗しました: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error("AI share error:", error);
    return NextResponse.json(
      { error: "投稿中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
