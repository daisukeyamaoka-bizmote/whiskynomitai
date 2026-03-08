import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
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

    const { answers } = await request.json();

    if (!answers) {
      return NextResponse.json(
        { error: "回答データが必要です" },
        { status: 400 }
      );
    }

    // Save onboarding answers to user_preferences
    const { error: upsertError } = await supabase
      .from("user_preferences")
      .upsert(
        {
          user_id: user.id,
          onboarding_completed: true,
          onboarding_answers: answers,
          top_flavors: answers.flavors || [],
          top_regions: [],
          preferred_types: [],
        },
        { onConflict: "user_id" }
      );

    if (upsertError) {
      console.error("Upsert error:", upsertError);
    }

    // Generate AI recommendations based on answers
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === "placeholder") {
      return NextResponse.json({
        recommendations: getDefaultRecommendations(answers),
        sommelier_message: getDefaultMessage(answers),
      });
    }

    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `あなたはフレンドリーなウイスキーソムリエです。新しいお客様が以下のように自己紹介してくれました。

ウイスキー経験: ${answers.experience}
好みの味わい: ${(answers.flavors || []).join("、")}
飲み方: ${answers.drinking_style}
興味のある産地: ${answers.interest_region}
予算感: ${answers.budget}

この方にぴったりのウイスキーを3本おすすめしてください。
必ずJSON形式のみで回答してください。

{
  "sommelier_message": "この方への一言メッセージ（2-3文で、フレンドリーに。名前は使わない。好みの傾向を簡潔に分析した上で、ウイスキーの旅を一緒に楽しもうという感じで）",
  "recommendations": [
    {
      "name": "ウイスキー名",
      "distillery": "蒸留所名",
      "region": "産地",
      "type": "タイプ（シングルモルト等）",
      "reason": "おすすめ理由（1-2文、この人の好みに合わせて具体的に）",
      "flavor_tags": ["フレーバー特徴を2-3個"]
    }
  ]
}`,
        },
      ],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return NextResponse.json(result);
    }

    return NextResponse.json({
      recommendations: getDefaultRecommendations(answers),
      sommelier_message: getDefaultMessage(answers),
    });
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json(
      { error: "オンボーディング中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { data } = await supabase
      .from("user_preferences")
      .select("onboarding_completed")
      .eq("user_id", user.id)
      .single();

    return NextResponse.json({
      completed: data?.onboarding_completed || false,
    });
  } catch {
    return NextResponse.json({ completed: false });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getDefaultMessage(answers: Record<string, any>): string {
  const exp = answers.experience;
  if (exp === "beginner") {
    return "ウイスキーの世界へようこそ！あなたの好みに合わせて、飲みやすいものから少しずつ冒険していきましょう。一緒にあなただけのウイスキージャーナルを作っていきましょう！";
  }
  return "素晴らしい味覚をお持ちですね！記録を重ねるほど、あなたの好みをより深く理解していきます。まだ出会っていない最高の一杯を一緒に見つけましょう！";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getDefaultRecommendations(answers: Record<string, any>) {
  const flavors = answers.flavors || [];
  const recs = [];

  if (flavors.includes("スモーキー")) {
    recs.push({
      name: "Ardbeg 10",
      distillery: "アードベッグ",
      region: "アイラ",
      type: "シングルモルト",
      reason: "スモーキーな味わいが好きなあなたにぴったり。力強いピート香とレモンの爽やかさが楽しめます。",
      flavor_tags: ["スモーキー", "ピート", "レモン"],
    });
  }

  if (flavors.includes("フルーティー") || flavors.includes("甘い")) {
    recs.push({
      name: "Glenfiddich 12",
      distillery: "グレンフィディック",
      region: "スペイサイド",
      type: "シングルモルト",
      reason: "フルーティーで飲みやすく、洋梨やバニラの甘い香りが広がります。入門にも最適な一本。",
      flavor_tags: ["フルーティー", "バニラ", "洋梨"],
    });
  }

  if (recs.length < 3) {
    recs.push({
      name: "Maker's Mark",
      distillery: "メーカーズマーク",
      region: "ケンタッキー",
      type: "バーボン",
      reason: "キャラメルとバニラの甘さが心地よい、まろやかなバーボン。ハイボールにしても美味しいです。",
      flavor_tags: ["キャラメル", "バニラ", "まろやか"],
    });
  }

  if (recs.length < 3) {
    recs.push({
      name: "Talisker 10",
      distillery: "タリスカー",
      region: "スカイ島",
      type: "シングルモルト",
      reason: "海の潮風を感じるスパイシーな味わい。スモーキーさとフルーティーさのバランスが絶妙です。",
      flavor_tags: ["スパイシー", "潮風", "スモーキー"],
    });
  }

  return recs.slice(0, 3);
}
