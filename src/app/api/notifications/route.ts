import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // First, get my post IDs (single query, reused below)
    const { data: myPosts } = await supabase
      .from("timeline_posts")
      .select("id")
      .eq("user_id", user.id);
    const myPostIds = (myPosts || []).map((p) => p.id);

    // Fetch all notification sources in parallel
    const [followsRes, likesRes, bookmarksRes, commentsRes] = await Promise.all([
      supabase
        .from("user_follows")
        .select("id, follower_id, created_at")
        .eq("following_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20),
      myPostIds.length > 0
        ? supabase
            .from("timeline_likes")
            .select("id, user_id, post_id, created_at")
            .in("post_id", myPostIds)
            .neq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(20)
        : Promise.resolve({ data: [] }),
      myPostIds.length > 0
        ? supabase
            .from("user_bookmarks")
            .select("id, user_id, post_id, whiskey_name, created_at")
            .in("post_id", myPostIds)
            .neq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(20)
        : Promise.resolve({ data: [] }),
      myPostIds.length > 0
        ? supabase
            .from("timeline_comments")
            .select("id, user_id, post_id, content, created_at")
            .in("post_id", myPostIds)
            .neq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(20)
        : Promise.resolve({ data: [] }),
    ]);

    // Collect all unique user IDs and post IDs
    const allUserIds = new Set<string>();
    const allPostIds = new Set<string>();
    (followsRes.data || []).forEach((f) => allUserIds.add(f.follower_id));
    (likesRes.data || []).forEach((l) => { allUserIds.add(l.user_id); allPostIds.add(l.post_id); });
    (bookmarksRes.data || []).forEach((b) => { allUserIds.add(b.user_id); allPostIds.add(b.post_id); });
    (commentsRes.data || []).forEach((c) => { allUserIds.add(c.user_id); allPostIds.add(c.post_id); });

    // Fetch display names and post whiskey names in parallel (batch, no N+1)
    const userIdArray = [...allUserIds];
    const [postNamesResult, profilesResult] = await Promise.all([
      allPostIds.size > 0
        ? supabase.from("timeline_posts").select("id, whiskey_name").in("id", [...allPostIds])
        : Promise.resolve({ data: [] }),
      userIdArray.length > 0
        ? supabase
            .from("user_profiles")
            .select("id, display_name, avatar_url")
            .in("id", userIdArray)
        : Promise.resolve({ data: [] }),
    ]);

    const nameMap = new Map<string, string>();
    const avatarMap = new Map<string, string>();
    for (const p of (profilesResult.data || []) as { id: string; display_name: string; avatar_url: string }[]) {
      nameMap.set(p.id, p.display_name || "ウイスキーファン");
      avatarMap.set(p.id, p.avatar_url || "");
    }
    const postNameMap = new Map(
      (postNamesResult.data || []).map((p: { id: string; whiskey_name: string }) => [p.id, p.whiskey_name || ""])
    );

    // Build unified notification list
    type Notification = {
      id: string;
      type: "follow" | "like" | "bookmark" | "comment";
      actor_id: string;
      actor_name: string;
      actor_avatar_url: string;
      post_id?: string;
      whiskey_name?: string;
      content?: string;
      created_at: string;
    };

    const notifications: Notification[] = [];

    (followsRes.data || []).forEach((f) => {
      notifications.push({
        id: `follow-${f.id}`,
        type: "follow",
        actor_id: f.follower_id,
        actor_name: nameMap.get(f.follower_id) || "ウイスキーファン",
        actor_avatar_url: avatarMap.get(f.follower_id) || "",
        created_at: f.created_at,
      });
    });

    (likesRes.data || []).forEach((l) => {
      notifications.push({
        id: `like-${l.id}`,
        type: "like",
        actor_id: l.user_id,
        actor_name: nameMap.get(l.user_id) || "ウイスキーファン",
        actor_avatar_url: avatarMap.get(l.user_id) || "",
        post_id: l.post_id,
        whiskey_name: postNameMap.get(l.post_id) || "",
        created_at: l.created_at,
      });
    });

    (bookmarksRes.data || []).forEach((b) => {
      notifications.push({
        id: `bookmark-${b.id}`,
        type: "bookmark",
        actor_id: b.user_id,
        actor_name: nameMap.get(b.user_id) || "ウイスキーファン",
        actor_avatar_url: avatarMap.get(b.user_id) || "",
        post_id: b.post_id,
        whiskey_name: b.whiskey_name || postNameMap.get(b.post_id) || "",
        created_at: b.created_at,
      });
    });

    (commentsRes.data || []).forEach((c) => {
      notifications.push({
        id: `comment-${c.id}`,
        type: "comment",
        actor_id: c.user_id,
        actor_name: nameMap.get(c.user_id) || "ウイスキーファン",
        actor_avatar_url: avatarMap.get(c.user_id) || "",
        post_id: c.post_id,
        whiskey_name: postNameMap.get(c.post_id) || "",
        content: c.content,
        created_at: c.created_at,
      });
    });

    // Sort by created_at desc
    notifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json(
      { notifications: notifications.slice(0, 50) },
      { headers: { "Cache-Control": "private, max-age=0, stale-while-revalidate=30" } }
    );
  } catch (error) {
    console.error("Notifications error:", error);
    return NextResponse.json({ error: "通知の取得に失敗しました" }, { status: 500 });
  }
}
