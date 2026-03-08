import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { checkAiUsage, logAiUsage } from "@/lib/ai-usage";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // Freemium gate
    const usage = await checkAiUsage(supabase, user.id);
    if (!usage.canUse) {
      return NextResponse.json(
        {
          error: "今月のAI無料利用回数（3回）を超えました",
          upgrade: true,
          usage,
        },
        { status: 403 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === "placeholder") {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEYが設定されていません。" },
        { status: 500 }
      );
    }

    const { record_id, name, distillery, region, type, age, abv } =
      await request.json();

    if (!name) {
      return NextResponse.json(
        { error: "ウイスキー名が必要です" },
        { status: 400 }
      );
    }

    const anthropic = new Anthropic({ apiKey });

    const whiskyContext = [
      name,
      distillery && `蒸留所: ${distillery}`,
      region && `産地: ${region}`,
      type && `タイプ: ${type}`,
      age && `熟成年数: ${age}年`,
      abv && `度数: ${abv}%`,
    ]
      .filter(Boolean)
      .join("、");

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `あなたはウイスキーの専門家です。以下のウイスキーについて、詳細な情報を日本語で提供してください。

ウイスキー情報: ${whiskyContext}

以下のJSON形式で回答してください。各セクションは具体的で詳しい内容にしてください。
推測や一般論ではなく、このウイスキー固有の情報を提供してください。
情報が不明な場合は、そのウイスキーのカテゴリ（産地・タイプ）に基づいた具体的な情報を提供してください。

必ずJSON形式のみで回答してください。余分なテキストは含めないでください。

{
  "distillery_history": "蒸留所の歴史（設立年、創業者、重要な出来事など。3-5文程度）",
  "distillery_features": "蒸留所の特徴（立地、水源、ポットスチルの形状、こだわりなど。2-3文程度）",
  "production_method": "製造方法（麦芽の種類、ピートの使用、蒸留回数、熟成に使う樽の種類など。3-5文程度）",
  "tasting_profile": "味わいのプロフィール（香り、味わい、フィニッシュの詳細。2-3文程度）",
  "food_pairings": [
    {
      "name": "つまみの名前",
      "reason": "なぜ合うのか（1文）"
    }
  ]
}

food_pairingsは5つ提供してください。具体的な料理名やおつまみ名を挙げてください。`,
        },
      ],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "調査結果を取得できませんでした" },
        { status: 500 }
      );
    }

    const result = JSON.parse(jsonMatch[0]);

    // Log AI usage
    await logAiUsage(supabase, user.id, "research");

    // Save research result to database
    if (record_id) {
      await supabase
        .from("tasting_records")
        .update({ research_data: result })
        .eq("id", record_id)
        .eq("user_id", user.id);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Research error:", error);

    let errorMessage = "調査中にエラーが発生しました";
    const errorStr = error instanceof Error ? error.message : String(error);

    if (errorStr.includes("401")) {
      errorMessage = "APIキーが無効です。";
    } else if (errorStr.includes("429")) {
      errorMessage = "APIのレート制限に達しました。しばらく待ってから再試行してください。";
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
