import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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
      .select("name, distillery, region, type, abv, age, flavor_tags, rating, note")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Records fetch error:", error);
      return NextResponse.json(
        { error: "記録の取得に失敗しました" },
        { status: 500 }
      );
    }

    if (!records || records.length < 2) {
      return NextResponse.json(
        {
          error: "おすすめを表示するには2本以上の記録が必要です",
          total_tastings: records?.length || 0,
        },
        { status: 400 }
      );
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `以下はユーザーのウイスキーテイスティング履歴です。

${JSON.stringify(records, null, 2)}

このユーザーの好みの傾向を分析し、まだ飲んでいないウイスキーの中からおすすめを3-5本提案してください。

必ず以下のJSON形式のみで回答してください。余分なテキストは含めないでください。

{
  "suggestions": [
    {
      "name": "ウイスキー名",
      "distillery": "蒸留所名",
      "region": "産地",
      "type": "タイプ",
      "flavor_tags": ["フレーバー"],
      "reason": "このユーザーにおすすめする理由（日本語1-2文）",
      "match_score": 0から100の好みマッチ度
    }
  ],
  "taste_profile": {
    "top_flavors": ["好みフレーバーTOP3"],
    "preferred_regions": ["好み産地"],
    "tendency": "この人の好みを日本語で1文で要約"
  }
}`,
        },
      ],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "サジェスト結果を取得できませんでした" },
        { status: 500 }
      );
    }

    const result = JSON.parse(jsonMatch[0]);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Suggest error:", error);
    return NextResponse.json(
      { error: "おすすめの取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
