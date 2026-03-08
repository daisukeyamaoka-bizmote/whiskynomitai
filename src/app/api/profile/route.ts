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

    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: body.full_name ?? user.user_metadata?.full_name,
        display_name: body.display_name ?? user.user_metadata?.display_name,
        user_handle: body.user_handle ?? user.user_metadata?.user_handle,
        bio: body.bio ?? user.user_metadata?.bio,
        avatar_url: body.avatar_url ?? user.user_metadata?.avatar_url,
        website: body.website ?? user.user_metadata?.website,
        twitter: body.twitter ?? user.user_metadata?.twitter,
        instagram: body.instagram ?? user.user_metadata?.instagram,
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
