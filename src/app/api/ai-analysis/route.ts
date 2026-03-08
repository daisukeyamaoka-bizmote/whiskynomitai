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

    const usage = await checkAiUsage(supabase, user.id);
    if (!usage.canUse) {
      return NextResponse.json(
        { error: "今月のAI無料利用回数（3回）を超えました" },
        { status: 403 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === "placeholder") {
      return NextResponse.json(
        { error: "AI機能は現在利用できません" },
        { status: 503 }
      );
    }

    const { data: records, error } = await supabase
      .from("tasting_records")
      .select(
        "name, distillery, region, type, abv, age, flavor_tags, rating, note"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "記録の取得に失敗しました" },
        { status: 500 }
      );
    }

    if (!records || records.length < 2) {
      return NextResponse.json(
        {
          error: "AIマイスター分析には2本以上の記録が必要です",
          total_tastings: records?.length || 0,
        },
        { status: 400 }
      );
    }

    const anthropic = new Anthropic({ apiKey });

    // Build taste summary
    const flavorCount: Record<string, number> = {};
    const regionCount: Record<string, number> = {};
    const typeCount: Record<string, number> = {};
    const highRated: string[] = [];
    const alreadyDrunk = new Set<string>();

    for (const r of records) {
      alreadyDrunk.add(r.name);
      if (r.flavor_tags) {
        for (const t of r.flavor_tags)
          flavorCount[t] = (flavorCount[t] || 0) + 1;
      }
      if (r.region) regionCount[r.region] = (regionCount[r.region] || 0) + 1;
      if (r.type) typeCount[r.type] = (typeCount[r.type] || 0) + 1;
      if (r.rating >= 8) highRated.push(`${r.name}(${r.rating}/10)`);
    }

    const topFlavors = Object.entries(flavorCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k, v]) => `${k}(${v}回)`);
    const topRegions = Object.entries(regionCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k, v]) => `${k}(${v}回)`);
    const topTypes = Object.entries(typeCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k, v]) => `${k}(${v}回)`);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      messages: [
        {
          role: "user",
          content: `あなたはウイスキーの専門家「AIマイスター」です。以下のユーザーの飲酒履歴から、パーソナリティ分析とおすすめを一度に行ってください。

## ユーザーの好み傾向
- よく出るフレーバー: ${topFlavors.join(", ") || "データなし"}
- よく飲む産地: ${topRegions.join(", ") || "データなし"}
- よく飲むタイプ: ${topTypes.join(", ") || "データなし"}
- 高評価をつけた銘柄: ${highRated.slice(0, 8).join(", ") || "なし"}
- 合計テイスティング数: ${records.length}本

## 飲酒履歴（最新順、最大30件）
${JSON.stringify(
  records.slice(0, 30).map((r) => ({
    name: r.name,
    distillery: r.distillery,
    region: r.region,
    type: r.type,
    flavor_tags: r.flavor_tags,
    rating: r.rating,
    note: r.note ? r.note.slice(0, 100) : null,
  })),
  null,
  2
)}

## おすすめの方針（重要）
1. **バーでしか飲めないような希少・限定的な銘柄を優先**してください。
2. バーで「これ飲んでみたい」と言えるような、**知る人ぞ知る銘柄**や**蒸留所限定品**、**シングルカスク**、**インディペンデントボトラーの作品**などを提案してください。
3. 日本のバーで実際に見かける可能性がある銘柄にしてください（架空の銘柄は絶対にNG）。
4. ユーザーがまだ飲んでいない銘柄を提案してください。既に飲んだ銘柄: ${[...alreadyDrunk].slice(0, 20).join(", ")}

## おすすめ理由の書き方（重要）
- **必ずユーザーの過去の飲酒傾向を具体的に引用**してください。
- 理由は2-3文で、具体的な銘柄名や評価を引用しながら書いてください。

必ず以下のJSON形式のみで回答してください。余分なテキストは含めないでください。

{
  "personality_title": "この人のウイスキー好みを表す短いタイトル（例: 「スモーキー探究者」「甘美なハイランドファン」など、10文字以内）",
  "personality_description": "この人の好みの傾向を2-3文で具体的に説明（高評価のウイスキーの共通点、好む味わいの方向性など）",
  "strength": "この人の味覚の特徴や強み（1文）",
  "next_challenge": "次に挑戦すると面白そうなウイスキーの方向性（1文、具体的な銘柄名を1つ含める）",
  "suggestions": [
    {
      "name": "ウイスキー名（正式名称）",
      "distillery": "蒸留所名",
      "region": "産地",
      "type": "タイプ（シングルモルト等）",
      "flavor_tags": ["フレーバータグ"],
      "reason": "ユーザーの傾向を引用した具体的なおすすめ理由（2-3文）",
      "match_score": 85
    }
  ],
  "taste_profile": {
    "top_flavors": ["好みフレーバーTOP3"],
    "preferred_regions": ["好み産地"],
    "tendency": "この人の好みの傾向を日本語で2文で具体的に要約（銘柄名を引用）"
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
        { error: "AI分析結果を取得できませんでした" },
        { status: 500 }
      );
    }

    const result = JSON.parse(jsonMatch[0]);
    await logAiUsage(supabase, user.id, "ai_analysis");

    return NextResponse.json(result);
  } catch (error) {
    console.error("AI analysis error:", error);
    return NextResponse.json(
      { error: "AI分析中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
