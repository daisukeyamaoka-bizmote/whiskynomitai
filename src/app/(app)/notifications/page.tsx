"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Loader2,
  UserPlus,
  GlassWater,
  Bookmark,
  MessageCircle,
  Bell,
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

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
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
      <h1 className="text-xl font-bold text-whiskey-text">通知</h1>

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 size={32} className="animate-spin text-whiskey-gold" />
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
          {notifications.map((n) => {
            const href = n.type === "follow" ? `/user/${n.actor_id}` : `/user/${n.actor_id}`;
            return (
              <Link
                key={n.id}
                href={href}
                className="flex items-start gap-3 glass-card p-3 active:opacity-70"
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
            );
          })}
        </div>
      )}
    </div>
  );
}
