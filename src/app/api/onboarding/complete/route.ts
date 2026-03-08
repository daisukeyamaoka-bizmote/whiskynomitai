import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // Mark onboarding as completed - upsert to handle both new and existing records
    const { error } = await supabase
      .from("user_preferences")
      .upsert(
        {
          user_id: user.id,
          onboarding_completed: true,
        },
        { onConflict: "user_id" }
      );

    if (error) {
      console.error("Complete onboarding error:", error);
      return NextResponse.json(
        { error: "オンボーディングの完了に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Complete onboarding error:", error);
    return NextResponse.json(
      { error: "エラーが発生しました" },
      { status: 500 }
    );
  }
}
