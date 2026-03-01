import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "ファイルが必要です" },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "ファイルサイズは5MB以下にしてください" },
        { status: 400 }
      );
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("whiskey-photos")
      .upload(fileName, file);

    if (uploadError) {
      console.error("Upload error:", uploadError);
      let errorMsg = "アップロードに失敗しました";
      if (uploadError.message?.includes("not found") || uploadError.message?.includes("Bucket")) {
        errorMsg = "ストレージバケット「whiskey-photos」が存在しません。Supabaseで作成してください。";
      } else if (uploadError.message) {
        errorMsg += `: ${uploadError.message}`;
      }
      return NextResponse.json(
        { error: errorMsg },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("whiskey-photos").getPublicUrl(fileName);

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "アップロード中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
