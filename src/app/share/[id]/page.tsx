import { Metadata } from "next";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import ShareRedirect from "./ShareRedirect";

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

  const { data: meta } = await supabase.rpc("get_user_profile_meta", {
    p_user_id: data.user_id,
  });

  return {
    ...data,
    user_name: meta?.display_name || "ウイスキーファン",
  };
}

async function getBaseUrl() {
  const h = await headers();
  const host = h.get("host") || "whiskynomitai.vercel.app";
  const proto = h.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const [post, baseUrl] = await Promise.all([getPost(id), getBaseUrl()]);

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

  const ogImageUrl = `${baseUrl}/api/og?${ogParams.toString()}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function SharePage({ params }: Props) {
  const { id } = await params;
  return <ShareRedirect postId={id} />;
}
