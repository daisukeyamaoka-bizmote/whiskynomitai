import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkAiUsage, logAiUsage } from "@/lib/ai-usage";
import Anthropic from "@anthropic-ai/sdk";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // Check AI usage limits
    const usage = await checkAiUsage(supabase, user.id);
    if (!usage.canUse) {
      return NextResponse.json(
        { error: "本日のAI利用回数の上限に達しました", usage },
        { status: 429 }
      );
    }

    const { messages, location } = (await request.json()) as {
      messages: ChatMessage[];
      location?: { lat: number; lng: number; area: string } | null;
    };

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: "メッセージが必要です" }, { status: 400 });
    }

    // Limit message history length to prevent abuse
    const limitedMessages = messages.slice(-20);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === "placeholder") {
      return NextResponse.json(
        { error: "AI機能が設定されていません" },
        { status: 500 }
      );
    }

    // Fetch user's tasting records for context
    const [recordsRes, timelineRes, bookmarksRes] = await Promise.all([
      supabase
        .from("tasting_records")
        .select("name, distillery, region, type, flavor_tags, rating, note")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("timeline_posts")
        .select("comment, whiskey_name, whiskey_region, whiskey_type, whiskey_rating, whiskey_flavor_tags")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("user_bookmarks")
        .select("whiskey_name, whiskey_region, whiskey_type, whiskey_rating, whiskey_flavor_tags")
        .eq("user_id", user.id)
        .limit(10),
    ]);

    const records = recordsRes.data || [];
    const timelinePosts = timelineRes.data || [];
    const bookmarks = bookmarksRes.data || [];

    // Build taste profile summary
    const flavorCount: Record<string, number> = {};
    const regionCount: Record<string, number> = {};
    const typeCount: Record<string, number> = {};
    let ratingSum = 0;
    let ratingN = 0;

    for (const r of records) {
      if (r.flavor_tags) {
        for (const t of r.flavor_tags) flavorCount[t] = (flavorCount[t] || 0) + 1;
      }
      if (r.region) regionCount[r.region] = (regionCount[r.region] || 0) + 1;
      if (r.type) typeCount[r.type] = (typeCount[r.type] || 0) + 1;
      if (r.rating) { ratingSum += r.rating; ratingN++; }
    }

    const topFlavors = Object.entries(flavorCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k);
    const topRegions = Object.entries(regionCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
    const topTypes = Object.entries(typeCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
    const avgRating = ratingN > 0 ? Math.round((ratingSum / ratingN) * 10) / 10 : null;

    // Get user display name
    const { data: nameData } = await supabase.rpc("get_user_display_name", {
      uid: user.id,
    });
    const userName = nameData || "ウイスキーファン";

    const systemPrompt = `あなたは「ウイスキーノミタイ」アプリの専属AIソムリエです。名前は「ノミタイソムリエ」。
ユーザーの好みを深く理解し、最高のウイスキー体験をサポートする上質なソムリエとして振る舞ってください。

## あなたの役割
- ウイスキーのおすすめ（銘柄・飲み方・ペアリング）
- バーのおすすめ（ユーザーの現在地や好みに基づいて）
- バーでの頼み方のアドバイス（「こう頼むとかっこいい」「バーテンダーとこう話すといい」）
- ウイスキーの知識（歴史、製法、テイスティングノート）
- 口コミ・評判情報の整理
- ユーザーの好みの傾向分析と新しい発見への導き

## ユーザー情報
- 名前: ${userName}
- テイスティング記録数: ${records.length}本
- 好みフレーバー: ${topFlavors.join(", ") || "まだデータなし"}
- 好み産地: ${topRegions.join(", ") || "まだデータなし"}
- 好みタイプ: ${topTypes.join(", ") || "まだデータなし"}
- 平均評価: ${avgRating ?? "データなし"}/10
${records.length > 0 ? `- 最近の記録: ${records.slice(0, 5).map((r) => `${r.name}(${r.rating}/10)`).join(", ")}` : ""}
${bookmarks.length > 0 ? `- 気になるウイスキー(ツギノム): ${bookmarks.slice(0, 5).map((b) => b.whiskey_name).join(", ")}` : ""}
${location ? `- 現在地: ${location.area}（緯度${location.lat}, 経度${location.lng}）` : "- 現在地: 未共有"}

## 会話スタイル
- 親しみやすいが、プロフェッショナルな知識を持つソムリエ口調
- 日本語で丁寧だが堅すぎない
- ユーザーの好みデータを積極的に活用して個別化した回答を
- バーをおすすめする際は実在しそうな具体的な情報を提供
- 「〜がお好きなら」「〜の傾向がありますね」など好みに言及
- 回答は簡潔に。長くても300文字程度に
- 絵文字は控えめに使用（🥃 程度）`;

    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages: limitedMessages.map((m) => ({
        role: m.role,
        content: typeof m.content === "string" ? m.content.slice(0, 2000) : "",
      })),
    });

    const responseText =
      response.content[0].type === "text" ? response.content[0].text : "";

    await logAiUsage(supabase, user.id, "sommelier");

    return NextResponse.json({ reply: responseText });
  } catch (error) {
    console.error("Sommelier error:", error);
    return NextResponse.json(
      { error: "ソムリエとの会話中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
