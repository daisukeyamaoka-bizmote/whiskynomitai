import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

async function getPost(postId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("timeline_posts")
    .select(
      "id, comment, whiskey_name, whiskey_distillery, whiskey_region, whiskey_type, whiskey_rating, whiskey_photo_url, whiskey_flavor_tags, whiskey_drinking_location, user_id"
    )
    .eq("id", postId)
    .eq("is_public", true)
    .single();

  if (!data) return null;

  // Get user name
  const { data: meta } = await supabase.rpc("get_user_profile_meta", {
    p_user_id: data.user_id,
  });

  return {
    ...data,
    user_name: meta?.display_name || "ウイスキーファン",
    user_handle: meta?.user_handle || "",
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const post = await getPost(id);

  if (!post) {
    return { title: "投稿が見つかりません - ウイスキーノミタイ" };
  }

  const title = `${post.whiskey_name} ${post.whiskey_rating}/10 - ウイスキーノミタイ`;
  const description = [
    post.comment,
    [post.whiskey_distillery, post.whiskey_region, post.whiskey_type]
      .filter(Boolean)
      .join(" / "),
    post.whiskey_drinking_location
      ? `📍 ${post.whiskey_drinking_location}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const ogParams = new URLSearchParams({
    name: post.whiskey_name || "",
    rating: String(post.whiskey_rating || 0),
    distillery: post.whiskey_distillery || "",
    region: post.whiskey_region || "",
    type: post.whiskey_type || "",
    tags: (post.whiskey_flavor_tags || []).join(","),
    photo: post.whiskey_photo_url || "",
    user: post.user_name || "",
  });

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      images: [`/api/og?${ogParams.toString()}`],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/api/og?${ogParams.toString()}`],
    },
  };
}

export default async function SharePage({ params }: Props) {
  const { id } = await params;
  // Redirect to main app — the OGP metadata is served for crawlers,
  // but real users get sent to the timeline
  redirect(`/?post=${id}`);
}
