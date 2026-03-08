import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { checkAiUsage, logAiUsage } from "@/lib/ai-usage";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const aiUsage = await checkAiUsage(supabase, user.id);
    if (!aiUsage.canUse) {
      return NextResponse.json(
        { error: "今月のAI無料利用回数（3回）を超えました" },
        { status: 403 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === "placeholder") {
      return NextResponse.json({ error: "AI機能は現在利用できません" }, { status: 503 });
    }

    const { data: records } = await supabase
      .from("tasting_records")
      .select("name, type, region, rating, flavor_tags")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (!records || records.length < 2) {
      return NextResponse.json({ error: "記録が2つ以上必要です" }, { status: 400 });
    }

    const anthropic = new Anthropic({ apiKey });

    const summary = records.map((r) => ({
      name: r.name,
      type: r.type,
      region: r.region,
      rating: r.rating,
      flavors: r.flavor_tags,
    }));

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `あなたはウイスキーソムリエです。以下のテイスティング履歴から、この人のウイスキーの好みを分析してください。

${JSON.stringify(summary)}

必ずJSON形式のみで回答してください。

{
  "personality_title": "この人のウイスキー好みを表す短いタイトル（例: 「スモーキー探究者」「甘美なハイランドファン」など、10文字以内）",
  "personality_description": "この人の好みの傾向を2-3文で具体的に説明（高評価のウイスキーの共通点、好む味わいの方向性など）",
  "strength": "この人の味覚の特徴や強み（1文）",
  "next_challenge": "次に挑戦すると面白そうなウイスキーの方向性（1文、具体的な銘柄名を1つ含める）"
}`,
        },
      ],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const aiAnalysis = JSON.parse(jsonMatch[0]);
      await logAiUsage(supabase, user.id, "dashboard");
      return NextResponse.json(aiAnalysis, {
        headers: { "Cache-Control": "private, max-age=300, stale-while-revalidate=600" },
      });
    }

    return NextResponse.json({ error: "AI分析に失敗しました" }, { status: 500 });
  } catch (error) {
    console.error("AI dashboard error:", error);
    return NextResponse.json(
      { error: "AI分析中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
