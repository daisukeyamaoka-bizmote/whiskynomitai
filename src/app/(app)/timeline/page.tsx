"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MessageCircle,
  Loader2,
  UserPlus,
  UserCheck,
  Wine,
  Send,
  X,
  ChevronDown,
  Bookmark,
  GlassWater,
} from "lucide-react";
import Image from "next/image";

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

type Tab = "all" | "following";

export default function TimelinePage() {
  const [tab, setTab] = useState<Tab>("all");
  const [posts, setPosts] = useState<TimelinePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  const fetchPosts = useCallback(
    async (p: number, reset = false) => {
      if (reset) setLoading(true);
      else setLoadingMore(true);

      try {
        const res = await fetch(`/api/timeline?tab=${tab}&page=${p}`);
        if (res.ok) {
          const data = await res.json();
          setPosts((prev) => (reset ? data.posts : [...prev, ...data.posts]));
          setHasMore(data.hasMore);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [tab]
  );

  useEffect(() => {
    setPage(1);
    setPosts([]);
    fetchPosts(1, true);
  }, [tab, fetchPosts]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        setPage(1);
        fetchPosts(1, true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [fetchPosts]);

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchPosts(next);
  };

  // ノミタイ（いいね）
  const handleNomitai = async (postId: string, isLiked: boolean) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              is_liked: !isLiked,
              likes_count: isLiked ? p.likes_count - 1 : p.likes_count + 1,
            }
          : p
      )
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
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                is_liked: isLiked,
                likes_count: isLiked ? p.likes_count : p.likes_count - 1,
              }
            : p
        )
      );
    }
  };

  // ツギノム（ブックマーク）
  const handleBookmark = async (post: TimelinePost) => {
    const wasBookmarked = post.is_bookmarked;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id ? { ...p, is_bookmarked: !wasBookmarked } : p
      )
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
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id ? { ...p, is_bookmarked: wasBookmarked } : p
        )
      );
    }
  };

  const handleFollow = async (userId: string, isFollowing: boolean) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.user_id === userId ? { ...p, is_following: !isFollowing } : p
      )
    );

    try {
      await fetch("/api/timeline/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          action: isFollowing ? "unfollow" : "follow",
        }),
      });
    } catch {
      setPosts((prev) =>
        prev.map((p) =>
          p.user_id === userId ? { ...p, is_following: isFollowing } : p
        )
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
        setPosts((prev) =>
          prev.map((p) =>
            p.id === commentPostId
              ? { ...p, comments_count: p.comments_count + 1 }
              : p
          )
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

  return (
    <div className="py-4 space-y-4 animate-fadeIn">
      <h1 className="text-xl font-bold text-whiskey-text">みんなのウイ活</h1>

      {/* Tab Switcher */}
      <div className="flex glass-card overflow-hidden !rounded-xl">
        <button
          onClick={() => setTab("all")}
          className={`flex-1 py-2.5 text-sm font-bold transition-all duration-300 relative ${
            tab === "all"
              ? "text-whiskey-gold bg-whiskey-gold/5"
              : "text-whiskey-muted hover:text-whiskey-text"
          }`}
        >
          みんな
          {tab === "all" && (
            <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-whiskey-gold rounded-full tab-indicator" />
          )}
        </button>
        <button
          onClick={() => setTab("following")}
          className={`flex-1 py-2.5 text-sm font-bold transition-all duration-300 relative ${
            tab === "following"
              ? "text-whiskey-gold bg-whiskey-gold/5"
              : "text-whiskey-muted hover:text-whiskey-text"
          }`}
        >
          フォロー中
          {tab === "following" && (
            <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-whiskey-gold rounded-full tab-indicator" />
          )}
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 size={32} className="animate-spin text-whiskey-gold" />
        </div>
      )}

      {/* Empty State */}
      {!loading && posts.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-12 animate-fadeInScale">
          <div className="w-20 h-20 rounded-full glass-card flex items-center justify-center animate-float">
            <Wine size={32} className="text-whiskey-muted" />
          </div>
          <p className="text-whiskey-muted text-sm text-center">
            {tab === "following"
              ? "フォロー中のユーザーの投稿がここに表示されます"
              : "まだウイ活がありません。最初の投稿をしてみましょう！"}
          </p>
        </div>
      )}

      {/* Posts */}
      {!loading && (
        <div className="space-y-4 stagger-children">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onNomitai={() => handleNomitai(post.id, post.is_liked)}
              onComment={() => openComments(post.id)}
              onBookmark={() => handleBookmark(post)}
              onFollow={() => handleFollow(post.user_id, post.is_following)}
              formatTime={formatTime}
            />
          ))}

          {hasMore && (
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="w-full py-3 text-sm text-whiskey-muted hover:text-whiskey-gold transition-all duration-300 flex items-center justify-center gap-2 hover:gap-3"
            >
              {loadingMore ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ChevronDown size={16} />
              )}
              もっと見る
            </button>
          )}
        </div>
      )}

      {/* Comment Modal */}
      {commentPostId && (
        <div className="fixed inset-0 glass-overlay z-50 flex items-end justify-center animate-fadeIn">
          <div className="w-full max-w-[480px] glass-card !rounded-b-none !rounded-t-2xl max-h-[70vh] flex flex-col animate-slideUp">
            <div className="flex items-center justify-between p-4 border-b border-whiskey-border/50">
              <h3 className="text-sm font-bold text-whiskey-text">コメント</h3>
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
                <div
                  key={comment.id}
                  className="flex gap-3 animate-fadeInUp"
                >
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

function PostCard({
  post,
  onNomitai,
  onComment,
  onBookmark,
  onFollow,
  formatTime,
}: {
  post: TimelinePost;
  onNomitai: () => void;
  onComment: () => void;
  onBookmark: () => void;
  onFollow: () => void;
  formatTime: (d: string) => string;
}) {
  const record = post.tasting_records;

  return (
    <div className="glass-card overflow-hidden">
      {/* User Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-whiskey-gold/8 border border-whiskey-gold/15 flex items-center justify-center">
            <span className="text-whiskey-gold text-sm font-bold">
              {post.user_name.charAt(0)}
            </span>
          </div>
          <div>
            <p className="text-sm font-bold text-whiskey-text">
              {post.user_name}
            </p>
            <p className="text-[10px] text-whiskey-muted">
              {formatTime(post.created_at)}
            </p>
          </div>
        </div>
        {!post.is_own && (
          <button
            onClick={onFollow}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-all duration-300 active:scale-90 ${
              post.is_following
                ? "bg-whiskey-border/50 text-whiskey-muted"
                : "glass-tag text-whiskey-gold"
            }`}
          >
            {post.is_following ? (
              <>
                <UserCheck size={12} />
                フォロー中
              </>
            ) : (
              <>
                <UserPlus size={12} />
                フォロー
              </>
            )}
          </button>
        )}
      </div>

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
        {/* Whiskey Info */}
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

        {/* Flavor Tags */}
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

        {/* Comment / Note */}
        {(post.comment || record?.note) && (
          <p className="text-whiskey-text text-sm leading-relaxed">
            {post.comment || record?.note}
          </p>
        )}

        {/* Actions: ノミタイ・コメント・ツギノム */}
        <div className="flex items-center pt-1">
          {/* ノミタイ */}
          <button
            onClick={onNomitai}
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
              {post.is_liked && post.likes_count === 0 ? "" : ""}
            </span>
            {post.likes_count === 0 && !post.is_liked && (
              <span className="text-[10px]">ノミタイ</span>
            )}
          </button>

          {/* コメント */}
          <button
            onClick={onComment}
            className="flex items-center gap-1.5 text-whiskey-muted hover:text-whiskey-gold transition-colors mr-5"
          >
            <MessageCircle size={18} />
            <span className="text-xs">
              {post.comments_count > 0 ? post.comments_count : ""}
            </span>
            {post.comments_count === 0 && (
              <span className="text-[10px]">コメント</span>
            )}
          </button>

          {/* ツギノム (右端に配置) */}
          <button
            onClick={onBookmark}
            className={`flex items-center gap-1.5 transition-all duration-300 active:scale-125 ml-auto ${
              post.is_bookmarked
                ? "text-amber-500"
                : "text-whiskey-muted hover:text-amber-500"
            }`}
          >
            <Bookmark
              size={18}
              fill={post.is_bookmarked ? "currentColor" : "none"}
            />
            {!post.is_bookmarked && (
              <span className="text-[10px]">ツギノム</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
