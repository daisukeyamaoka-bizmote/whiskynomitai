import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || "",
      display_name: user.user_metadata?.display_name || "",
      user_handle: user.user_metadata?.user_handle || "",
      bio: user.user_metadata?.bio || "",
      avatar_url: user.user_metadata?.avatar_url || "",
      website: user.user_metadata?.website || "",
      twitter: user.user_metadata?.twitter || "",
      instagram: user.user_metadata?.instagram || "",
    });
  } catch {
    return NextResponse.json(
      { error: "プロフィールの取得に失敗しました" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const body = await request.json();

    // Input validation: allowed fields with length limits
    const allowedFields: Record<string, number> = {
      full_name: 50,
      display_name: 50,
      user_handle: 30,
      bio: 200,
      avatar_url: 500,
      website: 200,
      twitter: 50,
      instagram: 50,
    };

    const sanitized: Record<string, string> = {};
    for (const [key, maxLen] of Object.entries(allowedFields)) {
      if (key in body) {
        const val = typeof body[key] === "string" ? body[key].trim().slice(0, maxLen) : body[key];
        sanitized[key] = val;
      }
    }

    // Validate user_handle format: alphanumeric + underscore only
    if (sanitized.user_handle && !/^[a-zA-Z0-9_]+$/.test(sanitized.user_handle)) {
      return NextResponse.json(
        { error: "ユーザーハンドルは英数字とアンダースコアのみ使用できます" },
        { status: 400 }
      );
    }

    // Validate URL fields
    const urlFields = ["website"];
    for (const field of urlFields) {
      if (sanitized[field] && sanitized[field] !== "") {
        try {
          new URL(sanitized[field]);
        } catch {
          return NextResponse.json(
            { error: `${field}は有効なURLを入力してください` },
            { status: 400 }
          );
        }
      }
    }

    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: sanitized.full_name ?? user.user_metadata?.full_name,
        display_name: sanitized.display_name ?? user.user_metadata?.display_name,
        user_handle: sanitized.user_handle ?? user.user_metadata?.user_handle,
        bio: sanitized.bio ?? user.user_metadata?.bio,
        avatar_url: sanitized.avatar_url ?? user.user_metadata?.avatar_url,
        website: sanitized.website ?? user.user_metadata?.website,
        twitter: sanitized.twitter ?? user.user_metadata?.twitter,
        instagram: sanitized.instagram ?? user.user_metadata?.instagram,
      },
    });

    if (error) {
      return NextResponse.json(
        { error: "プロフィールの更新に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "プロフィールの更新中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
