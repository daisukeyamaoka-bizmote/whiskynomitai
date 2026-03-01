import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { image, media_type } = await request.json();

    if (!image || !media_type) {
      return NextResponse.json(
        { error: "画像データが必要です" },
        { status: 400 }
      );
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: media_type as
                  | "image/jpeg"
                  | "image/png"
                  | "image/gif"
                  | "image/webp",
                data: image,
              },
            },
            {
              type: "text",
              text: `このウイスキーボトルの画像を分析してください。
ラベルに書かれている情報を正確に読み取り、以下のJSON形式で返してください。
不明な項目はnullとしてください。
ウイスキーのボトルでない場合は、{"error": "ウイスキーのボトルを撮影してください"} を返してください。

必ずJSON形式のみで回答してください。余分なテキストは含めないでください。

{
  "name": "正式なウイスキー名（英語表記）",
  "name_ja": "日本語名（あれば）",
  "distillery": "蒸留所名",
  "region": "産地（例: スペイサイド、アイラ、ハイランド、日本、ケンタッキー等）",
  "country": "国名",
  "type": "タイプ（例: シングルモルト、ブレンデッド、バーボン、ジャパニーズ等）",
  "abv": アルコール度数（数値）,
  "age": 熟成年数（数値）,
  "flavor_tags": ["フレーバー特徴を3-5個（例: スモーキー、フルーティー、バニラ等）"],
  "description": "このウイスキーの特徴を日本語で2-3文で説明"
}`,
            },
          ],
        },
      ],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "解析結果を取得できませんでした" },
        { status: 500 }
      );
    }

    const result = JSON.parse(jsonMatch[0]);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Analyze error:", error);
    return NextResponse.json(
      { error: "画像の解析中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
