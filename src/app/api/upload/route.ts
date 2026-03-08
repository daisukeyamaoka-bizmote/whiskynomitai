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

    // Validate file type: images only
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "画像ファイル（JPEG, PNG, WebP, HEIC）のみアップロードできます" },
        { status: 400 }
      );
    }

    const allowedExts = ["jpg", "jpeg", "png", "webp", "heic", "heif"];
    const fileExt = file.name.split(".").pop()?.toLowerCase();
    if (!fileExt || !allowedExts.includes(fileExt)) {
      return NextResponse.json(
        { error: "許可されていないファイル形式です" },
        { status: 400 }
      );
    }

    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("whiskey-photos")
      .upload(fileName, file);

    if (uploadError) {
      console.error("Upload error:", uploadError);
      const errorMsg = "アップロードに失敗しました";
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
