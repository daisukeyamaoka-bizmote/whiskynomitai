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
  Heart,
  MapPin,
  Star,
  Bookmark,
  GlassWater,
  ArrowLeft,
  Send,
  X,
  Trophy,
  Sparkles,
  Award,
  Target,
  BarChart3,
  TrendingUp,
  Link as LinkIcon,
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
  user_avatar_url?: string;
  is_own: boolean;
}

interface TasteProfile {
  top_flavors: string[];
  top_regions: string[];
  top_types: string[];
  avg_rating: number | null;
}

interface UserProfile {
  id: string;
  display_name: string;
  avatar_url: string;
  bio: string;
  website: string;
  twitter: string;
  instagram: string;
  is_own: boolean;
  is_following: boolean;
  following_count: number;
  follower_count: number;
  record_count: number;
  taste_profile: TasteProfile;
  compatibility: number | null;
  posts: TimelinePost[];
}

interface FollowUser {
  id: string;
  display_name: string;
  avatar_url?: string;
}

interface FlavorStat { name: string; count: number; }
interface BreakdownItem { name: string; count: number; avgRating: number; }
interface Favorite { name: string; rating: number; type: string | null; region: string | null; }
interface RatingTrendItem { month: string; avgRating: number; count: number; }
interface RecentRecord { name: string; rating: number; type: string | null; region: string | null; photo_url: string | null; created_at: string; }

interface DashboardData {
  total: number;
  avgRating: number;
  ratingDistribution: Record<string, number>;
  topFlavors: FlavorStat[];
  regionBreakdown: BreakdownItem[];
  typeBreakdown: BreakdownItem[];
  favorites: Favorite[];
  ratingTrend: RatingTrendItem[];
  recentRecords: RecentRecord[];
  xp: number;
  preferences: { top_flavors: string[]; top_regions: string[]; };
}

// Level System
const LEVEL_DEFS = [
  { level: 1, title: "ビギナー", minXp: 0 },
  { level: 2, title: "テイスター", minXp: 30 },
  { level: 3, title: "愛好家", minXp: 80 },
  { level: 4, title: "探究者", minXp: 160 },
  { level: 5, title: "ウイスキー通", minXp: 300 },
  { level: 6, title: "コニサー", minXp: 500 },
  { level: 7, title: "ソムリエ", minXp: 800 },
  { level: 8, title: "マスター", minXp: 1200 },
  { level: 9, title: "グランドマスター", minXp: 1800 },
  { level: 10, title: "レジェンド", minXp: 2500 },
];

function getLevel(xp: number) {
  let current = LEVEL_DEFS[0];
  for (const def of LEVEL_DEFS) {
    if (xp >= def.minXp) current = def;
    else break;
  }
  const nextIdx = LEVEL_DEFS.findIndex((d) => d.level === current.level) + 1;
  const next = nextIdx < LEVEL_DEFS.length ? LEVEL_DEFS[nextIdx] : null;
  const progressToNext = next
    ? ((xp - current.minXp) / (next.minXp - current.minXp)) * 100
    : 100;
  return { ...current, xp, next, progressToNext: Math.min(progressToNext, 100) };
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
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
      const [profileRes, dashboardRes] = await Promise.all([
        fetch(`/api/user/${userId}`, { cache: "no-store" }),
        fetch(`/api/user/${userId}/dashboard`, { cache: "no-store" }),
      ]);

      if (profileRes.ok) {
        const data = await profileRes.json();
        if (data.is_own) {
          router.replace("/mypage");
          return;
        }
        setProfile(data);
      }

      if (dashboardRes.ok) {
        const d = await dashboardRes.json();
        if (d.total > 0) setDashboard(d);
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
            posts: prev.posts.map((p) => ({ ...p, is_following: !wasFollowing })),
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
              posts: prev.posts.map((p) => ({ ...p, is_following: wasFollowing })),
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
                ? { ...p, is_liked: !isLiked, likes_count: isLiked ? p.likes_count - 1 : p.likes_count + 1 }
                : p
            ),
          }
        : prev
    );
    try {
      await fetch("/api/timeline/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: postId, action: isLiked ? "unlike" : "like" }),
      });
    } catch {
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              posts: prev.posts.map((p) =>
                p.id === postId
                  ? { ...p, is_liked: isLiked, likes_count: isLiked ? p.likes_count : p.likes_count - 1 }
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
        ? { ...prev, posts: prev.posts.map((p) => p.id === post.id ? { ...p, is_bookmarked: !wasBookmarked } : p) }
        : prev
    );
    try {
      await fetch("/api/timeline/bookmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_id: post.id,
          action: wasBookmarked ? "unbookmark" : "bookmark",
          whiskey: wasBookmarked ? undefined : {
            name: post.tasting_records.name, distillery: post.tasting_records.distillery,
            region: post.tasting_records.region, type: post.tasting_records.type,
            rating: post.tasting_records.rating, photo_url: post.tasting_records.photo_url,
            flavor_tags: post.tasting_records.flavor_tags,
          },
        }),
      });
    } catch {
      setProfile((prev) =>
        prev
          ? { ...prev, posts: prev.posts.map((p) => p.id === post.id ? { ...p, is_bookmarked: wasBookmarked } : p) }
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
        body: JSON.stringify({ post_id: commentPostId, content: commentText.trim() }),
      });
      if (res.ok) {
        const newComment = await res.json();
        setComments((prev) => [...prev, newComment]);
        setCommentText("");
        setProfile((prev) =>
          prev
            ? { ...prev, posts: prev.posts.map((p) => p.id === commentPostId ? { ...p, comments_count: p.comments_count + 1 } : p) }
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
    return date.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
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
        <p className="text-whiskey-muted text-sm">ユーザーが見つかりませんでした</p>
        <button onClick={() => router.back()} className="text-whiskey-gold text-sm">戻る</button>
      </div>
    );
  }

  const level = dashboard ? getLevel(dashboard.xp) : null;
  const maxRatingCount = dashboard
    ? Math.max(...Object.values(dashboard.ratingDistribution).map(Number), 1)
    : 1;
  const maxFlavorCount = dashboard
    ? Math.max(...dashboard.topFlavors.map((f) => f.count), 1)
    : 1;

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
          <div className="w-20 h-20 rounded-full bg-whiskey-gold/8 border-2 border-whiskey-gold/20 flex items-center justify-center overflow-hidden">
            {profile.avatar_url ? (
              <Image src={profile.avatar_url} alt="" width={80} height={80} className="w-full h-full object-cover" />
            ) : (
              <span className="text-whiskey-gold font-bold text-3xl">
                {profile.display_name.charAt(0)}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-lg font-bold text-whiskey-text">{profile.display_name}</h1>
            {profile.bio && <p className="text-xs text-whiskey-text/80 mt-1 line-clamp-2">{profile.bio}</p>}
            {(profile.website || profile.twitter || profile.instagram) && (
              <div className="flex items-center justify-center gap-3 mt-2">
                {profile.website && <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-whiskey-gold/60 hover:text-whiskey-gold"><LinkIcon size={14} /></a>}
                {profile.twitter && <a href={`https://x.com/${profile.twitter.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-whiskey-gold/60 hover:text-whiskey-gold text-xs font-bold">𝕏</a>}
                {profile.instagram && <a href={`https://instagram.com/${profile.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-whiskey-gold/60 hover:text-whiskey-gold text-xs font-bold">IG</a>}
              </div>
            )}
          </div>

          {/* Follow/Follower Counts */}
          <div className="flex items-center gap-6">
            <button onClick={() => openFollowList("following")} className="text-center active:opacity-70">
              <p className="text-base font-bold text-whiskey-text">{profile.following_count}</p>
              <p className="text-xs text-whiskey-muted">フォロー</p>
            </button>
            <button onClick={() => openFollowList("followers")} className="text-center active:opacity-70">
              <p className="text-base font-bold text-whiskey-text">{profile.follower_count}</p>
              <p className="text-xs text-whiskey-muted">フォロワー</p>
            </button>
            <div className="text-center">
              <p className="text-base font-bold text-whiskey-text">{profile.record_count}</p>
              <p className="text-xs text-whiskey-muted">記録</p>
            </div>
          </div>

          {/* Follow Button */}
          <button
            onClick={handleFollow}
            disabled={followLoading}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 active:scale-95 ${
              profile.is_following ? "bg-whiskey-border/50 text-whiskey-muted" : "glass-button text-whiskey-bg"
            }`}
          >
            {followLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : profile.is_following ? (
              <><UserCheck size={16} />フォロー中</>
            ) : (
              <><UserPlus size={16} />フォローする</>
            )}
          </button>
        </div>
      </div>

      {/* Compatibility Badge */}
      {profile.compatibility != null && (
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
              profile.compatibility >= 70
                ? "border-green-400/50 bg-green-400/10"
                : profile.compatibility >= 40
                  ? "border-whiskey-gold/50 bg-whiskey-gold/10"
                  : "border-whiskey-border/50 bg-whiskey-border/10"
            }`}>
              <Heart
                size={18}
                className={profile.compatibility >= 70 ? "text-green-400" : profile.compatibility >= 40 ? "text-whiskey-gold" : "text-whiskey-muted"}
                fill={profile.compatibility >= 40 ? "currentColor" : "none"}
              />
            </div>
            <div>
              <p className="text-sm font-bold text-whiskey-text">
                テイスト相性{" "}
                <span className={profile.compatibility >= 70 ? "text-green-400" : profile.compatibility >= 40 ? "text-whiskey-gold" : "text-whiskey-muted"}>
                  {profile.compatibility}%
                </span>
              </p>
              <p className="text-[10px] text-whiskey-muted">
                {profile.compatibility >= 70 ? "好みがとても近いです！" : profile.compatibility >= 40 ? "共通の好みがあります" : "新しい発見があるかも"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Content (like MyPage) */}
      {dashboard && dashboard.total > 0 && (
        <div className="space-y-5 stagger-children">
          {/* Level Card */}
          {level && (
            <div className="glass-card-gold p-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-shrink-0">
                  <div className="w-16 h-16 rounded-full border-[3px] border-whiskey-gold flex items-center justify-center bg-whiskey-gold/10">
                    <div className="text-center">
                      <p className="text-whiskey-gold font-bold text-xs leading-none">Lv.</p>
                      <p className="text-whiskey-gold font-bold text-xl leading-none">{level.level}</p>
                    </div>
                  </div>
                  {level.level >= 5 && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-whiskey-gold rounded-full flex items-center justify-center">
                      <Trophy size={12} className="text-whiskey-bg" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-whiskey-gold font-bold text-lg">{level.title}</p>
                  <p className="text-whiskey-muted text-xs">{dashboard.xp} XP{level.next && ` / 次のレベルまで ${level.next.minXp - dashboard.xp} XP`}</p>
                  <div className="mt-2 h-2 bg-whiskey-bg rounded-full overflow-hidden border border-whiskey-border">
                    <div className="h-full bg-gradient-to-r from-whiskey-gold/70 to-whiskey-gold rounded-full" style={{ width: `${level.progressToNext}%` }} />
                  </div>
                  {level.next && <p className="text-[10px] text-whiskey-muted mt-1">次: Lv.{level.next.level} {level.next.title}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="glass-card p-3 text-center space-y-1">
              <Wine size={18} className="text-whiskey-gold mx-auto" />
              <p className="text-lg font-bold text-whiskey-text">{dashboard.total}</p>
              <p className="text-xs text-whiskey-muted">記録数</p>
            </div>
            <div className="glass-card p-3 text-center space-y-1">
              <Star size={18} className="text-whiskey-gold mx-auto" />
              <p className="text-lg font-bold text-whiskey-text">{dashboard.avgRating}</p>
              <p className="text-xs text-whiskey-muted">平均評価</p>
            </div>
            <div className="glass-card p-3 text-center space-y-1">
              <MapPin size={18} className="text-whiskey-gold mx-auto" />
              <p className="text-lg font-bold text-whiskey-text">{dashboard.regionBreakdown.length}</p>
              <p className="text-xs text-whiskey-muted">産地数</p>
            </div>
          </div>

          {/* Taste Preferences */}
          {(dashboard.preferences.top_flavors.length > 0 || dashboard.preferences.top_regions.length > 0) && (
            <div className="glass-card p-4 space-y-3">
              <h2 className="text-sm font-bold text-whiskey-gold">
                <Sparkles size={14} className="inline mr-1.5" />
                {profile.display_name}の好み
              </h2>
              {dashboard.preferences.top_flavors.length > 0 && (
                <div>
                  <p className="text-xs text-whiskey-muted mb-1.5">フレーバー</p>
                  <div className="flex flex-wrap gap-1.5">
                    {dashboard.preferences.top_flavors.map((f) => (
                      <span key={f} className="glass-tag px-2 py-0.5 text-whiskey-gold text-xs">{f}</span>
                    ))}
                  </div>
                </div>
              )}
              {dashboard.preferences.top_regions.length > 0 && (
                <div>
                  <p className="text-xs text-whiskey-muted mb-1.5">産地</p>
                  <div className="flex flex-wrap gap-1.5">
                    {dashboard.preferences.top_regions.map((r) => (
                      <span key={r} className="glass-tag px-2 py-0.5 text-whiskey-gold text-xs">{r}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Recent Records */}
          {dashboard.recentRecords.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-whiskey-gold">最近の記録</h2>
              {dashboard.recentRecords.map((record, i) => (
                <div key={i} className="glass-card p-3">
                  <div className="flex gap-3">
                    {record.photo_url ? (
                      <Image src={record.photo_url} alt={record.name} width={48} height={48} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-whiskey-border flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-whiskey-text truncate">{record.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-whiskey-gold text-xs font-bold">{record.rating}/10</span>
                        <span className="text-whiskey-muted text-xs">{new Date(record.created_at).toLocaleDateString("ja-JP")}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Rating Distribution */}
          <div className="glass-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-whiskey-gold" />
              <h2 className="text-sm font-bold text-whiskey-gold">評価の分布</h2>
            </div>
            <div className="space-y-1.5">
              {Array.from({ length: 10 }, (_, i) => {
                const rating = 10 - i;
                const count = dashboard.ratingDistribution[rating] || 0;
                const width = maxRatingCount > 0 ? Math.round((count / maxRatingCount) * 100) : 0;
                return (
                  <div key={rating} className="flex items-center gap-2">
                    <span className="text-xs text-whiskey-muted w-5 text-right">{rating}</span>
                    <div className="flex-1 h-4 bg-whiskey-bg/50 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-whiskey-gold/40 to-whiskey-gold/70 rounded-full" style={{ width: `${width}%` }} />
                    </div>
                    <span className="text-xs text-whiskey-muted w-5">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Flavors Chart */}
          {dashboard.topFlavors.length > 0 && (
            <div className="glass-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Target size={16} className="text-whiskey-gold" />
                <h2 className="text-sm font-bold text-whiskey-gold">好みフレーバー TOP{Math.min(dashboard.topFlavors.length, 8)}</h2>
              </div>
              <div className="space-y-2">
                {dashboard.topFlavors.map((flavor, i) => (
                  <div key={flavor.name} className="flex items-center gap-2">
                    <span className="text-xs text-whiskey-gold/60 w-4">{i + 1}</span>
                    <span className="text-sm text-whiskey-text w-24 truncate">{flavor.name}</span>
                    <div className="flex-1 h-3 bg-whiskey-bg/50 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{
                        width: `${Math.round((flavor.count / maxFlavorCount) * 100)}%`,
                        background: i === 0 ? "linear-gradient(90deg, rgba(212,175,55,0.6), rgba(212,175,55,1))"
                          : i === 1 ? "linear-gradient(90deg, rgba(212,175,55,0.4), rgba(212,175,55,0.7))"
                          : i === 2 ? "linear-gradient(90deg, rgba(212,175,55,0.3), rgba(212,175,55,0.5))"
                          : "linear-gradient(90deg, rgba(212,175,55,0.2), rgba(212,175,55,0.3))",
                      }} />
                    </div>
                    <span className="text-xs text-whiskey-muted w-5 text-right">{flavor.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Favorites */}
          {dashboard.favorites.length > 0 && (
            <div className="glass-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Award size={16} className="text-whiskey-gold" />
                <h2 className="text-sm font-bold text-whiskey-gold">お気に入り TOP{Math.min(dashboard.favorites.length, 5)}</h2>
              </div>
              <div className="space-y-2">
                {dashboard.favorites.map((fav, i) => (
                  <div key={i} className="flex items-center gap-3 py-1">
                    <span className="text-lg font-bold text-whiskey-gold/40 w-6 text-center">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-whiskey-text truncate">{fav.name}</p>
                      <p className="text-xs text-whiskey-muted">{[fav.type, fav.region].filter(Boolean).join(" / ")}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Star size={12} className="text-whiskey-gold fill-whiskey-gold" />
                      <span className="text-sm font-bold text-whiskey-gold">{fav.rating}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rating Trend */}
          {dashboard.ratingTrend.length > 1 && (
            <div className="glass-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-whiskey-gold" />
                <h2 className="text-sm font-bold text-whiskey-gold">評価の推移</h2>
              </div>
              <div className="flex items-end gap-1 h-24">
                {dashboard.ratingTrend.map((item) => (
                  <div key={item.month} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-whiskey-muted">{item.avgRating}</span>
                    <div className="w-full bg-gradient-to-t from-whiskey-gold/30 to-whiskey-gold/60 rounded-t" style={{ height: `${Math.round((item.avgRating / 10) * 100)}%`, minHeight: "4px" }} />
                    <span className="text-[9px] text-whiskey-muted truncate w-full text-center">{item.month.substring(5)}月</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* User's Posts */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-whiskey-gold" />
          <h2 className="text-sm font-bold text-whiskey-gold">{profile.display_name}のウイ活</h2>
        </div>

        {profile.posts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <Wine size={28} className="text-whiskey-muted" />
            <p className="text-whiskey-muted text-sm">まだ投稿がありません</p>
          </div>
        ) : (
          <div className="space-y-4 stagger-children">
            {profile.posts.map((post) => {
              const record = post.tasting_records;
              return (
                <div key={post.id} className="glass-card overflow-hidden">
                  {record?.photo_url && (
                    <div className="aspect-[4/3]">
                      <Image src={record.photo_url} alt={record.name || ""} width={480} height={360} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="px-4 py-3 space-y-2.5">
                    {record && (
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-whiskey-text text-sm">{record.name}</h3>
                          <p className="text-xs text-whiskey-muted">
                            {[record.distillery, record.region, record.type].filter(Boolean).join(" / ")}
                          </p>
                        </div>
                        <div className="flex-shrink-0 ml-2">
                          <div className="glass-tag !rounded-lg px-2 py-0.5 text-center">
                            <span className="text-whiskey-gold font-bold text-sm">{record.rating}/10</span>
                          </div>
                        </div>
                      </div>
                    )}
                    {record?.flavor_tags && record.flavor_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {record.flavor_tags.map((tag) => (
                          <span key={tag} className="glass-tag px-2 py-0.5 text-whiskey-gold text-xs">{tag}</span>
                        ))}
                      </div>
                    )}
                    {(post.comment || record?.note) && (
                      <p className="text-whiskey-text text-sm leading-relaxed">{post.comment || record?.note}</p>
                    )}
                    <p className="text-[10px] text-whiskey-muted">{formatTime(post.created_at)}</p>
                    <div className="flex items-center pt-1">
                      <button
                        onClick={() => handleNomitai(post.id, post.is_liked)}
                        className={`flex items-center gap-1.5 transition-all duration-300 active:scale-125 mr-5 ${post.is_liked ? "text-whiskey-gold" : "text-whiskey-muted hover:text-whiskey-gold"}`}
                      >
                        <GlassWater size={18} fill={post.is_liked ? "currentColor" : "none"} strokeWidth={post.is_liked ? 2.5 : 2} />
                        <span className="text-xs">{post.likes_count > 0 && post.likes_count}</span>
                        {post.likes_count === 0 && !post.is_liked && <span className="text-[10px]">ノミタイ</span>}
                      </button>
                      <button
                        onClick={() => openComments(post.id)}
                        className="flex items-center gap-1.5 text-whiskey-muted hover:text-whiskey-gold transition-colors mr-5"
                      >
                        <MessageCircle size={18} />
                        <span className="text-xs">{post.comments_count > 0 ? post.comments_count : ""}</span>
                        {post.comments_count === 0 && <span className="text-[10px]">コメント</span>}
                      </button>
                      <button
                        onClick={() => handleBookmark(post)}
                        className={`flex items-center gap-1.5 transition-all duration-300 active:scale-125 ml-auto ${post.is_bookmarked ? "text-amber-500" : "text-whiskey-muted hover:text-amber-500"}`}
                      >
                        <Bookmark size={18} fill={post.is_bookmarked ? "currentColor" : "none"} />
                        {!post.is_bookmarked && <span className="text-[10px]">ツギノム</span>}
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
              <button onClick={() => setFollowListType(null)} className="text-whiskey-muted hover:text-whiskey-text transition-all duration-200 hover:scale-110 active:scale-90">
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
                  <div className="w-10 h-10 rounded-full bg-whiskey-gold/8 border border-whiskey-gold/15 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {user.avatar_url ? (
                      <Image src={user.avatar_url} alt="" width={40} height={40} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-whiskey-gold text-sm font-bold">{user.display_name.charAt(0)}</span>
                    )}
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
              <h3 className="text-sm font-bold text-whiskey-text">コメント</h3>
              <button onClick={() => setCommentPostId(null)} className="text-whiskey-muted hover:text-whiskey-text transition-all duration-200 hover:scale-110 active:scale-90">
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
                <p className="text-whiskey-muted text-sm text-center py-4">まだコメントがありません</p>
              )}
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3 animate-fadeInUp">
                  <div className="w-8 h-8 rounded-full bg-whiskey-gold/5 border border-whiskey-gold/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {comment.user_avatar_url ? (
                      <Image src={comment.user_avatar_url} alt="" width={32} height={32} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-whiskey-gold/70 text-xs font-bold">{comment.user_name.charAt(0)}</span>
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
                placeholder="コメントを入力..."
                className="flex-1 glass-input rounded-full px-4 py-2 text-sm text-whiskey-text placeholder:text-whiskey-muted/50"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !(e.nativeEvent as KeyboardEvent).isComposing) submitComment();
                }}
              />
              <button
                onClick={submitComment}
                disabled={!commentText.trim() || submittingComment}
                className="w-10 h-10 rounded-full glass-button text-whiskey-bg flex items-center justify-center disabled:opacity-30 active:scale-90"
              >
                {submittingComment ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
