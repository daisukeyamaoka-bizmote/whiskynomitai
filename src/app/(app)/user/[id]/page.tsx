"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Loader2,
  UserPlus,
  UserCheck,
  Wine,
  Users,
  MessageCircle,
  Bookmark,
  GlassWater,
  ArrowLeft,
  Send,
  X,
} from "lucide-react";

interface TastingRecord {
  id: string;
  name: string;
  distillery: string | null;
  region: string | null;
  type: string | null;
  rating: number;
  photo_url: string | null;
  flavor_tags: string[];
  note: string | null;
}

interface TimelinePost {
  id: string;
  comment: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  user_id: string;
  user_name: string;
  is_liked: boolean;
  is_bookmarked: boolean;
  is_following: boolean;
  is_own: boolean;
  tasting_records: TastingRecord;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user_name: string;
  is_own: boolean;
}

interface UserProfile {
  id: string;
  display_name: string;
  is_own: boolean;
  is_following: boolean;
  following_count: number;
  follower_count: number;
  record_count: number;
  posts: TimelinePost[];
}

interface FollowUser {
  id: string;
  display_name: string;
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [followListType, setFollowListType] = useState<"following" | "followers" | null>(null);
  const [followList, setFollowList] = useState<FollowUser[]>([]);
  const [followListLoading, setFollowListLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch(`/api/user/${userId}`);
      if (res.ok) {
        const data = await res.json();
        // If it's own profile, redirect to MyPage
        if (data.is_own) {
          router.replace("/mypage");
          return;
        }
        setProfile(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [userId, router]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleFollow = async () => {
    if (!profile || followLoading) return;
    setFollowLoading(true);

    const wasFollowing = profile.is_following;
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            is_following: !wasFollowing,
            follower_count: wasFollowing
              ? prev.follower_count - 1
              : prev.follower_count + 1,
          }
        : prev
    );

    // Also update posts' is_following
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            posts: prev.posts.map((p) => ({
              ...p,
              is_following: !wasFollowing,
            })),
          }
        : prev
    );

    try {
      await fetch("/api/timeline/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          action: wasFollowing ? "unfollow" : "follow",
        }),
      });
    } catch {
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              is_following: wasFollowing,
              follower_count: wasFollowing
                ? prev.follower_count
                : prev.follower_count - 1,
              posts: prev.posts.map((p) => ({
                ...p,
                is_following: wasFollowing,
              })),
            }
          : prev
      );
    } finally {
      setFollowLoading(false);
    }
  };

  const openFollowList = async (type: "following" | "followers") => {
    setFollowListType(type);
    setFollowList([]);
    setFollowListLoading(true);
    try {
      const res = await fetch(`/api/follow-list?type=${type}&user_id=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setFollowList(data.users || []);
      }
    } catch {
      // ignore
    } finally {
      setFollowListLoading(false);
    }
  };

  const handleNomitai = async (postId: string, isLiked: boolean) => {
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            posts: prev.posts.map((p) =>
              p.id === postId
                ? {
                    ...p,
                    is_liked: !isLiked,
                    likes_count: isLiked
                      ? p.likes_count - 1
                      : p.likes_count + 1,
                  }
                : p
            ),
          }
        : prev
    );

    try {
      await fetch("/api/timeline/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_id: postId,
          action: isLiked ? "unlike" : "like",
        }),
      });
    } catch {
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              posts: prev.posts.map((p) =>
                p.id === postId
                  ? {
                      ...p,
                      is_liked: isLiked,
                      likes_count: isLiked
                        ? p.likes_count
                        : p.likes_count - 1,
                    }
                  : p
              ),
            }
          : prev
      );
    }
  };

  const handleBookmark = async (post: TimelinePost) => {
    const wasBookmarked = post.is_bookmarked;
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            posts: prev.posts.map((p) =>
              p.id === post.id
                ? { ...p, is_bookmarked: !wasBookmarked }
                : p
            ),
          }
        : prev
    );

    try {
      await fetch("/api/timeline/bookmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_id: post.id,
          action: wasBookmarked ? "unbookmark" : "bookmark",
          whiskey: wasBookmarked
            ? undefined
            : {
                name: post.tasting_records.name,
                distillery: post.tasting_records.distillery,
                region: post.tasting_records.region,
                type: post.tasting_records.type,
                rating: post.tasting_records.rating,
                photo_url: post.tasting_records.photo_url,
                flavor_tags: post.tasting_records.flavor_tags,
              },
        }),
      });
    } catch {
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              posts: prev.posts.map((p) =>
                p.id === post.id
                  ? { ...p, is_bookmarked: wasBookmarked }
                  : p
              ),
            }
          : prev
      );
    }
  };

  const openComments = async (postId: string) => {
    setCommentPostId(postId);
    setComments([]);
    setCommentText("");
    setLoadingComments(true);

    try {
      const res = await fetch(`/api/timeline/comment?post_id=${postId}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingComments(false);
    }
  };

  const submitComment = async () => {
    if (!commentPostId || !commentText.trim()) return;
    setSubmittingComment(true);

    try {
      const res = await fetch("/api/timeline/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_id: commentPostId,
          content: commentText.trim(),
        }),
      });

      if (res.ok) {
        const newComment = await res.json();
        setComments((prev) => [...prev, newComment]);
        setCommentText("");
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                posts: prev.posts.map((p) =>
                  p.id === commentPostId
                    ? { ...p, comments_count: p.comments_count + 1 }
                    : p
                ),
              }
            : prev
        );
      }
    } catch {
      // ignore
    } finally {
      setSubmittingComment(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) return "たった今";
    if (diffMin < 60) return `${diffMin}分前`;
    if (diffHour < 24) return `${diffHour}時間前`;
    if (diffDay < 7) return `${diffDay}日前`;
    return date.toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="py-8 flex justify-center">
        <Loader2 size={32} className="animate-spin text-whiskey-gold" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="py-12 text-center space-y-4">
        <p className="text-whiskey-muted text-sm">
          ユーザーが見つかりませんでした
        </p>
        <button
          onClick={() => router.back()}
          className="text-whiskey-gold text-sm"
        >
          戻る
        </button>
      </div>
    );
  }

  return (
    <div className="py-4 space-y-5 animate-fadeIn">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-whiskey-muted hover:text-whiskey-text text-sm"
      >
        <ArrowLeft size={16} />
        戻る
      </button>

      {/* User Profile Card */}
      <div className="glass-card p-5">
        <div className="flex flex-col items-center text-center gap-3">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-full bg-whiskey-gold/8 border-2 border-whiskey-gold/20 flex items-center justify-center">
            <span className="text-whiskey-gold font-bold text-3xl">
              {profile.display_name.charAt(0)}
            </span>
          </div>

          {/* Name */}
          <h1 className="text-lg font-bold text-whiskey-text">
            {profile.display_name}
          </h1>

          {/* Follow/Follower Counts - clickable */}
          <div className="flex items-center gap-6">
            <button onClick={() => openFollowList("following")} className="text-center active:opacity-70">
              <p className="text-base font-bold text-whiskey-text">
                {profile.following_count}
              </p>
              <p className="text-xs text-whiskey-muted">フォロー</p>
            </button>
            <button onClick={() => openFollowList("followers")} className="text-center active:opacity-70">
              <p className="text-base font-bold text-whiskey-text">
                {profile.follower_count}
              </p>
              <p className="text-xs text-whiskey-muted">フォロワー</p>
            </button>
            <div className="text-center">
              <p className="text-base font-bold text-whiskey-text">
                {profile.record_count}
              </p>
              <p className="text-xs text-whiskey-muted">記録</p>
            </div>
          </div>

          {/* Follow Button */}
          <button
            onClick={handleFollow}
            disabled={followLoading}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 active:scale-95 ${
              profile.is_following
                ? "bg-whiskey-border/50 text-whiskey-muted"
                : "glass-button text-whiskey-bg"
            }`}
          >
            {followLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : profile.is_following ? (
              <>
                <UserCheck size={16} />
                フォロー中
              </>
            ) : (
              <>
                <UserPlus size={16} />
                フォローする
              </>
            )}
          </button>
        </div>
      </div>

      {/* User's Posts */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-whiskey-gold" />
          <h2 className="text-sm font-bold text-whiskey-gold">
            {profile.display_name}のウイ活
          </h2>
        </div>

        {profile.posts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <Wine size={28} className="text-whiskey-muted" />
            <p className="text-whiskey-muted text-sm">
              まだ投稿がありません
            </p>
          </div>
        ) : (
          <div className="space-y-4 stagger-children">
            {profile.posts.map((post) => {
              const record = post.tasting_records;
              return (
                <div key={post.id} className="glass-card overflow-hidden">
                  {/* Photo */}
                  {record?.photo_url && (
                    <div className="aspect-[4/3]">
                      <Image
                        src={record.photo_url}
                        alt={record.name || ""}
                        width={480}
                        height={360}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="px-4 py-3 space-y-2.5">
                    {record && (
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-whiskey-text text-sm">
                            {record.name}
                          </h3>
                          <p className="text-xs text-whiskey-muted">
                            {[record.distillery, record.region, record.type]
                              .filter(Boolean)
                              .join(" / ")}
                          </p>
                        </div>
                        <div className="flex-shrink-0 ml-2">
                          <div className="glass-tag !rounded-lg px-2 py-0.5 text-center">
                            <span className="text-whiskey-gold font-bold text-sm">
                              {record.rating}/10
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {record?.flavor_tags && record.flavor_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {record.flavor_tags.map((tag) => (
                          <span
                            key={tag}
                            className="glass-tag px-2 py-0.5 text-whiskey-gold text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {(post.comment || record?.note) && (
                      <p className="text-whiskey-text text-sm leading-relaxed">
                        {post.comment || record?.note}
                      </p>
                    )}

                    {/* Timestamp */}
                    <p className="text-[10px] text-whiskey-muted">
                      {formatTime(post.created_at)}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center pt-1">
                      <button
                        onClick={() =>
                          handleNomitai(post.id, post.is_liked)
                        }
                        className={`flex items-center gap-1.5 transition-all duration-300 active:scale-125 mr-5 ${
                          post.is_liked
                            ? "text-whiskey-gold"
                            : "text-whiskey-muted hover:text-whiskey-gold"
                        }`}
                      >
                        <GlassWater
                          size={18}
                          fill={post.is_liked ? "currentColor" : "none"}
                          strokeWidth={post.is_liked ? 2.5 : 2}
                        />
                        <span className="text-xs">
                          {post.likes_count > 0 && post.likes_count}
                        </span>
                        {post.likes_count === 0 && !post.is_liked && (
                          <span className="text-[10px]">ノミタイ</span>
                        )}
                      </button>

                      <button
                        onClick={() => openComments(post.id)}
                        className="flex items-center gap-1.5 text-whiskey-muted hover:text-whiskey-gold transition-colors mr-5"
                      >
                        <MessageCircle size={18} />
                        <span className="text-xs">
                          {post.comments_count > 0
                            ? post.comments_count
                            : ""}
                        </span>
                        {post.comments_count === 0 && (
                          <span className="text-[10px]">コメント</span>
                        )}
                      </button>

                      <button
                        onClick={() => handleBookmark(post)}
                        className={`flex items-center gap-1.5 transition-all duration-300 active:scale-125 ml-auto ${
                          post.is_bookmarked
                            ? "text-amber-500"
                            : "text-whiskey-muted hover:text-amber-500"
                        }`}
                      >
                        <Bookmark
                          size={18}
                          fill={
                            post.is_bookmarked ? "currentColor" : "none"
                          }
                        />
                        {!post.is_bookmarked && (
                          <span className="text-[10px]">ツギノム</span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Follow List Modal */}
      {followListType && (
        <div className="fixed inset-0 glass-overlay z-50 flex items-end justify-center animate-fadeIn">
          <div className="w-full max-w-[480px] glass-card !rounded-b-none !rounded-t-2xl max-h-[70vh] flex flex-col animate-slideUp">
            <div className="flex items-center justify-between p-4 border-b border-whiskey-border/50">
              <h3 className="text-sm font-bold text-whiskey-text">
                {followListType === "following" ? "フォロー中" : "フォロワー"}
              </h3>
              <button
                onClick={() => setFollowListType(null)}
                className="text-whiskey-muted hover:text-whiskey-text transition-all duration-200 hover:scale-110 active:scale-90"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {followListLoading && (
                <div className="flex justify-center py-8">
                  <Loader2 size={20} className="animate-spin text-whiskey-gold" />
                </div>
              )}
              {!followListLoading && followList.length === 0 && (
                <p className="text-whiskey-muted text-sm text-center py-8">
                  {followListType === "following" ? "まだ誰もフォローしていません" : "まだフォロワーがいません"}
                </p>
              )}
              {followList.map((user) => (
                <Link
                  key={user.id}
                  href={`/user/${user.id}`}
                  onClick={() => setFollowListType(null)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-whiskey-gold/5 transition-colors active:opacity-70"
                >
                  <div className="w-10 h-10 rounded-full bg-whiskey-gold/8 border border-whiskey-gold/15 flex items-center justify-center flex-shrink-0">
                    <span className="text-whiskey-gold text-sm font-bold">
                      {user.display_name.charAt(0)}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-whiskey-text">{user.display_name}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Comment Modal */}
      {commentPostId && (
        <div className="fixed inset-0 glass-overlay z-50 flex items-end justify-center animate-fadeIn">
          <div className="w-full max-w-[480px] glass-card !rounded-b-none !rounded-t-2xl max-h-[70vh] flex flex-col animate-slideUp">
            <div className="flex items-center justify-between p-4 border-b border-whiskey-border/50">
              <h3 className="text-sm font-bold text-whiskey-text">
                コメント
              </h3>
              <button
                onClick={() => setCommentPostId(null)}
                className="text-whiskey-muted hover:text-whiskey-text transition-all duration-200 hover:scale-110 active:scale-90"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingComments && (
                <div className="flex justify-center py-4">
                  <Loader2
                    size={20}
                    className="animate-spin text-whiskey-gold"
                  />
                </div>
              )}
              {!loadingComments && comments.length === 0 && (
                <p className="text-whiskey-muted text-sm text-center py-4">
                  まだコメントがありません
                </p>
              )}
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3 animate-fadeInUp">
                  <div className="w-8 h-8 rounded-full bg-whiskey-gold/5 border border-whiskey-gold/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-whiskey-gold/70 text-xs font-bold">
                      {comment.user_name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-bold text-whiskey-text">
                        {comment.user_name}
                      </span>
                      <span className="text-[10px] text-whiskey-muted">
                        {formatTime(comment.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-whiskey-text mt-0.5">
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-whiskey-border/50 flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="コメントを入力..."
                className="flex-1 glass-input rounded-full px-4 py-2 text-sm text-whiskey-text placeholder:text-whiskey-muted/50"
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    !(e.nativeEvent as KeyboardEvent).isComposing
                  ) {
                    submitComment();
                  }
                }}
              />
              <button
                onClick={submitComment}
                disabled={!commentText.trim() || submittingComment}
                className="w-10 h-10 rounded-full glass-button text-whiskey-bg flex items-center justify-center disabled:opacity-30 active:scale-90"
              >
                {submittingComment ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
