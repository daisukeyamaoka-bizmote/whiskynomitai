"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Loader2,
  UserPlus,
  GlassWater,
  Bookmark,
  MessageCircle,
  Bell,
  Send,
  X,
} from "lucide-react";

interface Notification {
  id: string;
  type: "follow" | "like" | "bookmark" | "comment";
  actor_id: string;
  actor_name: string;
  actor_avatar_url?: string;
  post_id?: string;
  whiskey_name?: string;
  content?: string;
  created_at: string;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user_name: string;
  user_avatar_url?: string;
  is_own: boolean;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyPostId, setReplyPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const lastFetchRef = useRef<number>(0);

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Refresh on visibility change with 30s cooldown
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === "visible" && Date.now() - lastFetchRef.current > 30000) {
        fetchNotifications(true);
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  const fetchNotifications = async (background = false) => {
    // If we already have data, refresh in background (no skeleton)
    if (background && notifications.length > 0) {
      // silent refresh
    } else if (notifications.length === 0) {
      setLoading(true);
    }
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        lastFetchRef.current = Date.now();
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const openReply = async (postId: string) => {
    setReplyPostId(postId);
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
    if (!replyPostId || !commentText.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await fetch("/api/timeline/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: replyPostId, content: commentText.trim() }),
      });
      if (res.ok) {
        const newComment = await res.json();
        setComments((prev) => [...prev, newComment]);
        setCommentText("");
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
    return date.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "follow": return <UserPlus size={16} className="text-blue-400" />;
      case "like": return <GlassWater size={16} className="text-whiskey-gold" />;
      case "bookmark": return <Bookmark size={16} className="text-amber-500" />;
      case "comment": return <MessageCircle size={16} className="text-green-400" />;
      default: return <Bell size={16} className="text-whiskey-muted" />;
    }
  };

  const getMessage = (n: Notification) => {
    switch (n.type) {
      case "follow":
        return <><strong>{n.actor_name}</strong>があなたをフォローしました</>;
      case "like":
        return <><strong>{n.actor_name}</strong>が{n.whiskey_name && <span className="text-whiskey-gold">「{n.whiskey_name}」</span>}をノミタイしました</>;
      case "bookmark":
        return <><strong>{n.actor_name}</strong>が{n.whiskey_name && <span className="text-amber-500">「{n.whiskey_name}」</span>}をツギノムに追加しました</>;
      case "comment":
        return <><strong>{n.actor_name}</strong>がコメントしました{n.content && <span className="text-whiskey-muted">: {n.content.substring(0, 30)}{n.content.length > 30 ? "..." : ""}</span>}</>;
    }
  };

  return (
    <div className="py-4 space-y-4 animate-fadeIn">
      {loading && (
        <div className="space-y-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="glass-card p-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full shimmer flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 shimmer rounded w-16" />
                  <div className="h-4 shimmer rounded w-4/5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && notifications.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="w-20 h-20 rounded-full glass-card flex items-center justify-center">
            <Bell size={32} className="text-whiskey-muted" />
          </div>
          <p className="text-whiskey-muted text-sm text-center">
            まだ通知がありません
          </p>
        </div>
      )}

      {!loading && notifications.length > 0 && (
        <div className="space-y-1">
          {notifications.map((n) => (
            <div key={n.id} className="glass-card overflow-hidden">
              <Link
                href={`/user/${n.actor_id}`}
                className="flex items-start gap-3 p-3 active:opacity-70"
              >
                <div className="w-9 h-9 rounded-full bg-whiskey-gold/8 border border-whiskey-gold/15 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {n.actor_avatar_url ? (
                    <Image src={n.actor_avatar_url} alt="" width={36} height={36} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-whiskey-gold text-xs font-bold">
                      {n.actor_name.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {getIcon(n.type)}
                    <span className="text-[10px] text-whiskey-muted">{formatTime(n.created_at)}</span>
                  </div>
                  <p className="text-sm text-whiskey-text leading-relaxed">
                    {getMessage(n)}
                  </p>
                </div>
              </Link>
              {/* Reply button for comment notifications */}
              {n.type === "comment" && n.post_id && (
                <div className="px-3 pb-2 pl-[52px]">
                  <button
                    onClick={() => openReply(n.post_id!)}
                    className="flex items-center gap-1.5 text-xs text-whiskey-gold hover:text-whiskey-gold/80 transition-colors active:scale-95"
                  >
                    <MessageCircle size={13} />
                    返信する
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reply Comment Modal */}
      {replyPostId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center animate-fadeIn glass-overlay">
          <div className="w-full max-w-[480px] bg-white border border-whiskey-border !rounded-b-none !rounded-t-2xl max-h-[70vh] flex flex-col animate-slideUp">
            <div className="flex items-center justify-between p-4 border-b border-whiskey-border/50">
              <h3 className="text-sm font-bold text-whiskey-text">コメント</h3>
              <button
                onClick={() => setReplyPostId(null)}
                className="text-whiskey-muted hover:text-whiskey-text transition-all duration-200 hover:scale-110 active:scale-90"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingComments && (
                <div className="flex justify-center py-4">
                  <Loader2 size={20} className="animate-spin text-whiskey-gold" />
                </div>
              )}
              {!loadingComments && comments.length === 0 && (
                <p className="text-whiskey-muted text-sm text-center py-4">
                  まだコメントがありません
                </p>
              )}
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3 animate-fadeInUp">
                  <div className="w-8 h-8 rounded-full bg-whiskey-gold/5 border border-whiskey-gold/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {comment.user_avatar_url ? (
                      <Image src={comment.user_avatar_url} alt="" width={32} height={32} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-whiskey-gold/70 text-xs font-bold">
                        {comment.user_name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-bold text-whiskey-text">{comment.user_name}</span>
                      <span className="text-[10px] text-whiskey-muted">{formatTime(comment.created_at)}</span>
                    </div>
                    <p className="text-sm text-whiskey-text mt-0.5">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-whiskey-border/50 flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="返信を入力..."
                className="flex-1 glass-input rounded-full px-4 py-2 text-sm text-whiskey-text placeholder:text-whiskey-muted/50"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !(e.nativeEvent as KeyboardEvent).isComposing) {
                    submitComment();
                  }
                }}
                autoFocus
              />
              <button
                onClick={submitComment}
                disabled={!commentText.trim() || submittingComment}
                className="w-10 h-10 rounded-full glass-button text-white flex items-center justify-center disabled:opacity-30 active:scale-90"
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
