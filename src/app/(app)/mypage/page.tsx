"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Image from "next/image";
import {
  Camera,
  Wine,
  Star,
  MapPin,
  Loader2,
  Trophy,
  Sparkles,
  RefreshCw,

  LogOut,
  Edit3,
  X,
  Check,
  TrendingUp,
  Award,
  Target,
  BarChart3,
  Compass,
  Link as LinkIcon,
} from "lucide-react";
import WhiskyLoader from "@/components/WhiskyLoader";

// --- Types ---
interface TastingRecord {
  id: string;
  name: string;
  region: string | null;
  type: string | null;
  rating: number;
  photo_url: string | null;
  flavor_tags: string[];
  created_at: string;
}

interface Preferences {
  top_flavors: string[];
  top_regions: string[];
  preferred_types: string[];
  avg_rating: number;
  total_tastings: number;
}

interface Suggestion {
  name: string;
  distillery: string;
  region: string;
  type: string;
  flavor_tags: string[];
  reason: string;
  match_score: number;
}

interface TasteProfile {
  top_flavors: string[];
  preferred_regions: string[];
  tendency: string;
}

interface SuggestResponse {
  suggestions: Suggestion[];
  taste_profile: TasteProfile;
}

interface FlavorStat { name: string; count: number; }
interface BreakdownItem { name: string; count: number; avgRating: number; }
interface Favorite { name: string; rating: number; type: string | null; region: string | null; }
interface RatingTrendItem { month: string; avgRating: number; count: number; }
interface AiAnalysis {
  personality_title: string;
  personality_description: string;
  strength: string;
  next_challenge: string;
}

interface DashboardData {
  total: number;
  avgRating: number;
  ratingDistribution: Record<string, number>;
  topFlavors: FlavorStat[];
  regionBreakdown: BreakdownItem[];
  typeBreakdown: BreakdownItem[];
  favorites: Favorite[];
  ratingTrend: RatingTrendItem[];
  aiAnalysis: AiAnalysis | null;
}

interface ProfileData {
  email: string;
  full_name: string;
  display_name: string;
  user_handle: string;
  bio: string;
  avatar_url: string;
  website: string;
  twitter: string;
  instagram: string;
}

interface Stats {
  total: number;
  avgRating: number;
  uniqueRegions: number;
  uniqueTypes: number;
  uniqueFlavors: number;
  highRatedCount: number;
  shareCount: number;
}

interface FollowUser {
  id: string;
  display_name: string;
  avatar_url?: string;
}

// --- Level System ---
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

function calcXp(stats: Stats): number {
  return (
    stats.total * 10 +
    stats.uniqueRegions * 20 +
    stats.uniqueTypes * 20 +
    stats.uniqueFlavors * 5 +
    stats.highRatedCount * 5 +
    stats.shareCount * 15
  );
}

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

function getXpBreakdown(stats: Stats) {
  return [
    { label: "記録", value: stats.total * 10, detail: `${stats.total}本 × 10` },
    { label: "産地", value: stats.uniqueRegions * 20, detail: `${stats.uniqueRegions}種 × 20` },
    { label: "タイプ", value: stats.uniqueTypes * 20, detail: `${stats.uniqueTypes}種 × 20` },
    { label: "フレーバー", value: stats.uniqueFlavors * 5, detail: `${stats.uniqueFlavors}種 × 5` },
    { label: "高評価", value: stats.highRatedCount * 5, detail: `${stats.highRatedCount}本 × 5` },
    { label: "シェア", value: stats.shareCount * 15, detail: `${stats.shareCount}回 × 15` },
  ];
}

export default function MyPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [recentRecords, setRecentRecords] = useState<TastingRecord[]>([]);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [stats, setStats] = useState<Stats>({
    total: 0, avgRating: 0, uniqueRegions: 0, uniqueTypes: 0,
    uniqueFlavors: 0, highRatedCount: 0, shareCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<Partial<ProfileData>>({});
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [showXpDetail, setShowXpDetail] = useState(false);
  const [suggestData, setSuggestData] = useState<SuggestResponse | null>(null);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState("");
  const [followingCount, setFollowingCount] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);
  const [followListType, setFollowListType] = useState<"following" | "followers" | null>(null);
  const [followList, setFollowList] = useState<FollowUser[]>([]);
  const [followListLoading, setFollowListLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    // Phase 1: Profile + follow counts (fastest, needed for above-the-fold)
    const profilePromise = fetch("/api/profile").catch(() => null);
    const authPromise = supabase.auth.getUser();

    const [profileRes, { data: { user: authUser } }] = await Promise.all([profilePromise, authPromise]);

    if (profileRes?.ok) {
      const p = await profileRes.json();
      setProfile(p);
      setEditForm(p);
    }

    // Start follow counts immediately (parallel with rest)
    if (authUser) {
      Promise.all([
        supabase.from("user_follows").select("id", { count: "exact", head: true }).eq("follower_id", authUser.id),
        supabase.from("user_follows").select("id", { count: "exact", head: true }).eq("following_id", authUser.id),
      ]).then(([followingRes, followerRes]) => {
        setFollowingCount(followingRes.count || 0);
        setFollowerCount(followerRes.count || 0);
      }).catch(() => {});
    }

    // Show profile card immediately
    setLoading(false);

    // Phase 2: Dashboard + records + preferences (non-blocking)
    const [dashboardRes, recordsRes, prefsRes, sharesRes] = await Promise.all([
      fetch("/api/dashboard").catch(() => null),
      fetch("/api/records?limit=3&page=1").catch(() => null),
      fetch("/api/preferences").catch(() => null),
      fetch("/api/shares").catch(() => null),
    ]);

    if (dashboardRes?.ok) {
      const d: DashboardData = await dashboardRes.json();
      setDashboard(d);
      const flavors = new Set(d.topFlavors.map((f) => f.name));
      const newStats: Stats = {
        total: d.total,
        avgRating: d.avgRating,
        uniqueRegions: d.regionBreakdown.length,
        uniqueTypes: d.typeBreakdown.length,
        uniqueFlavors: flavors.size,
        highRatedCount: Object.entries(d.ratingDistribution)
          .filter(([k]) => Number(k) >= 8)
          .reduce((sum, [, v]) => sum + Number(v), 0),
        shareCount: 0,
      };
      setStats(newStats);

      // Phase 3: Lazy-load AI analysis (only if enough data, non-blocking)
      if (d.total >= 2) {
        fetch("/api/dashboard/ai").then(async (res) => {
          if (res.ok) {
            const ai = await res.json();
            setDashboard((prev) => prev ? { ...prev, aiAnalysis: ai } : prev);
          }
        }).catch(() => {});
      }
    }

    if (recordsRes?.ok) {
      const rd = await recordsRes.json();
      setRecentRecords(rd.records || []);
    }

    if (prefsRes?.ok) {
      setPreferences(await prefsRes.json());
    }

    if (sharesRes?.ok) {
      const sd = await sharesRes.json();
      setStats((prev) => ({ ...prev, shareCount: sd.count || 0 }));
    }
  };

  const openFollowList = async (type: "following" | "followers") => {
    setFollowListType(type);
    setFollowList([]);
    setFollowListLoading(true);
    try {
      const res = await fetch(`/api/follow-list?type=${type}`);
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

  const fetchSuggestions = async () => {
    setSuggestLoading(true);
    setSuggestError("");
    try {
      const response = await fetch("/api/suggest");
      const result = await response.json();
      if (!response.ok) {
        setSuggestError(result.error || "");
        return;
      }
      setSuggestData(result);
    } catch {
      setSuggestError("おすすめの取得に失敗しました");
    } finally {
      setSuggestLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setProfile({ ...profile!, ...editForm } as ProfileData);
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", new File([file], `avatar_${Date.now()}.jpg`, { type: file.type }));
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      if (uploadRes.ok) {
        const { url } = await uploadRes.json();
        setEditForm((prev) => ({ ...prev, avatar_url: url }));
        await fetch("/api/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatar_url: url }),
        });
        setProfile((prev) => prev ? { ...prev, avatar_url: url } : prev);
      }
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  if (loading) {
    return (
      <WhiskyLoader />
    );
  }

  const displayName = profile?.display_name || profile?.full_name || "";
  const email = profile?.email || "";
  const xp = calcXp(stats);
  const level = getLevel(xp);
  const xpBreakdown = getXpBreakdown(stats);
  const maxRatingCount = dashboard
    ? Math.max(...Object.values(dashboard.ratingDistribution).map(Number), 1)
    : 1;
  const maxFlavorCount = dashboard
    ? Math.max(...dashboard.topFlavors.map((f) => f.count), 1)
    : 1;

  return (
    <div className="py-4 space-y-5 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-whiskey-text">マイページ</h1>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 glass-tag px-3 py-1.5 text-whiskey-gold text-xs font-bold active:scale-95"
          >
            <Edit3 size={12} />
            編集
          </button>
        )}
      </div>

      {/* Profile Edit Modal */}
      {editing && (
        <div className="fixed inset-0 glass-overlay z-50 flex items-end justify-center animate-fadeIn">
          <div className="w-full max-w-[480px] glass-card !rounded-b-none !rounded-t-2xl max-h-[85vh] flex flex-col animate-slideUp">
            <div className="flex items-center justify-between p-4 border-b border-whiskey-border/50">
              <button
                onClick={() => { setEditing(false); setEditForm(profile || {}); }}
                className="text-whiskey-muted hover:text-whiskey-text"
              >
                <X size={20} />
              </button>
              <h3 className="text-sm font-bold text-whiskey-text">プロフィール編集</h3>
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="text-whiskey-gold font-bold text-sm flex items-center gap-1 active:scale-90 disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                保存
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full overflow-hidden glass-card flex items-center justify-center animate-pulse-glow">
                    {editForm.avatar_url ? (
                      <Image src={editForm.avatar_url} alt="" width={96} height={96} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-whiskey-gold font-bold text-3xl">{(displayName || email).charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full glass-button text-white flex items-center justify-center active:scale-90"
                  >
                    {uploadingAvatar ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                  </button>
                  <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-whiskey-muted mb-1.5">表示名</label>
                <input type="text" value={editForm.display_name || ""} onChange={(e) => setEditForm((prev) => ({ ...prev, display_name: e.target.value }))} placeholder="ニックネーム" className="w-full glass-input px-3 py-2.5 text-sm text-whiskey-text placeholder:text-whiskey-muted/50" />
              </div>
              <div>
                <label className="block text-xs text-whiskey-muted mb-1.5">ユーザーID</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-whiskey-muted text-sm">@</span>
                  <input type="text" value={editForm.user_handle || ""} onChange={(e) => setEditForm((prev) => ({ ...prev, user_handle: e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() }))} placeholder="whisky_lover" maxLength={20} className="w-full glass-input pl-8 pr-3 py-2.5 text-sm text-whiskey-text placeholder:text-whiskey-muted/50" />
                </div>
                <p className="text-[10px] text-whiskey-muted mt-1">半角英数字とアンダースコアのみ</p>
              </div>
              <div>
                <label className="block text-xs text-whiskey-muted mb-1.5">名前</label>
                <input type="text" value={editForm.full_name || ""} onChange={(e) => setEditForm((prev) => ({ ...prev, full_name: e.target.value }))} placeholder="お名前" className="w-full glass-input px-3 py-2.5 text-sm text-whiskey-text placeholder:text-whiskey-muted/50" />
              </div>
              <div>
                <label className="block text-xs text-whiskey-muted mb-1.5">自己紹介</label>
                <textarea value={editForm.bio || ""} onChange={(e) => setEditForm((prev) => ({ ...prev, bio: e.target.value }))} placeholder="ウイスキーへの想いなど..." className="w-full glass-input px-3 py-2.5 text-sm text-whiskey-text placeholder:text-whiskey-muted/50 min-h-[80px] resize-none" />
              </div>
              <div className="space-y-3">
                <label className="block text-xs text-whiskey-muted">リンク</label>
                <div className="relative">
                  <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-whiskey-muted" />
                  <input type="url" value={editForm.website || ""} onChange={(e) => setEditForm((prev) => ({ ...prev, website: e.target.value }))} placeholder="https://example.com" className="w-full glass-input pl-9 pr-3 py-2.5 text-sm text-whiskey-text placeholder:text-whiskey-muted/50" />
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-whiskey-muted text-xs">𝕏</span>
                  <input type="text" value={editForm.twitter || ""} onChange={(e) => setEditForm((prev) => ({ ...prev, twitter: e.target.value }))} placeholder="@username" className="w-full glass-input pl-9 pr-3 py-2.5 text-sm text-whiskey-text placeholder:text-whiskey-muted/50" />
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-whiskey-muted text-xs">IG</span>
                  <input type="text" value={editForm.instagram || ""} onChange={(e) => setEditForm((prev) => ({ ...prev, instagram: e.target.value }))} placeholder="@username" className="w-full glass-input pl-9 pr-3 py-2.5 text-sm text-whiskey-text placeholder:text-whiskey-muted/50" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  <div className="w-10 h-10 rounded-full bg-whiskey-gold/8 border border-whiskey-gold/15 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {user.avatar_url ? (
                      <Image src={user.avatar_url} alt="" width={40} height={40} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-whiskey-gold text-sm font-bold">
                        {user.display_name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-whiskey-text">{user.display_name}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* User Card */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden glass-card-gold flex items-center justify-center flex-shrink-0 animate-pulse-glow">
            {profile?.avatar_url ? (
              <Image src={profile.avatar_url} alt="" width={64} height={64} className="w-full h-full object-cover" />
            ) : (
              <span className="text-whiskey-gold font-bold text-2xl">{(displayName || email).charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            {displayName && <p className="text-base font-bold text-whiskey-text truncate">{displayName}</p>}
            {profile?.user_handle && <p className="text-xs text-whiskey-gold/60 truncate">@{profile.user_handle}</p>}
            <p className="text-xs text-whiskey-muted truncate">{email}</p>
            {profile?.bio && <p className="text-xs text-whiskey-text/80 mt-1 line-clamp-2">{profile.bio}</p>}
            {(profile?.website || profile?.twitter || profile?.instagram) && (
              <div className="flex items-center gap-3 mt-2">
                {profile?.website && <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-whiskey-gold/60 hover:text-whiskey-gold"><LinkIcon size={14} /></a>}
                {profile?.twitter && <a href={`https://x.com/${profile.twitter.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-whiskey-gold/60 hover:text-whiskey-gold text-xs font-bold">𝕏</a>}
                {profile?.instagram && <a href={`https://instagram.com/${profile.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-whiskey-gold/60 hover:text-whiskey-gold text-xs font-bold">IG</a>}
              </div>
            )}
          </div>
        </div>
        {/* Follow/Follower Counts - clickable */}
        <div className="flex items-center justify-around mt-4 pt-3 border-t border-whiskey-border/50">
          <button onClick={() => openFollowList("following")} className="text-center active:opacity-70">
            <p className="text-base font-bold text-whiskey-text">{followingCount}</p>
            <p className="text-xs text-whiskey-muted">フォロー</p>
          </button>
          <button onClick={() => openFollowList("followers")} className="text-center active:opacity-70">
            <p className="text-base font-bold text-whiskey-text">{followerCount}</p>
            <p className="text-xs text-whiskey-muted">フォロワー</p>
          </button>
          <div className="text-center">
            <p className="text-base font-bold text-whiskey-text">{dashboard?.total || 0}</p>
            <p className="text-xs text-whiskey-muted">記録</p>
          </div>
        </div>
      </div>

      {stats.total === 0 ? (
        <div className="glass-card p-6 text-center space-y-3 animate-fadeInScale">
          <Wine size={32} className="text-whiskey-muted mx-auto animate-float" />
          <p className="text-whiskey-muted text-sm">ウイスキーを記録して、あなたの好みを分析しましょう</p>
          <Link href="/record" className="inline-block glass-button text-white font-bold px-6 py-2.5 text-sm">
            最初の1本を記録する
          </Link>
        </div>
      ) : (
        <div className="space-y-5 stagger-children">
          {/* Level Card */}
          <div className="glass-card-gold p-4 space-y-3 cursor-pointer" onClick={() => setShowXpDetail(!showXpDetail)}>
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
                    <Trophy size={12} className="text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-whiskey-gold font-bold text-lg">{level.title}</p>
                <p className="text-whiskey-muted text-xs">{xp} XP{level.next && ` / 次のレベルまで ${level.next.minXp - xp} XP`}</p>
                <div className="mt-2 h-2 bg-whiskey-bg rounded-full overflow-hidden border border-whiskey-border">
                  <div className="h-full bg-gradient-to-r from-whiskey-gold/70 to-whiskey-gold rounded-full" style={{ width: `${level.progressToNext}%` }} />
                </div>
                {level.next && <p className="text-[10px] text-whiskey-muted mt-1">次: Lv.{level.next.level} {level.next.title}</p>}
              </div>
            </div>
            {showXpDetail && (
              <div className="pt-2 border-t border-whiskey-border space-y-1.5">
                <p className="text-xs text-whiskey-muted font-bold">XP内訳</p>
                {xpBreakdown.map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-xs">
                    <span className="text-whiskey-muted">{item.label}</span>
                    <span className="text-whiskey-text">
                      <span className="text-whiskey-muted mr-2">{item.detail}</span>
                      <span className="text-whiskey-gold font-bold">+{item.value}</span>
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-whiskey-border/50">
                  <span className="text-whiskey-muted font-bold">合計</span>
                  <span className="text-whiskey-gold font-bold">{xp} XP</span>
                </div>
              </div>
            )}
          </div>

          {/* AI Personality */}
          {dashboard?.aiAnalysis && (
            <div className="glass-card-gold p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-whiskey-gold" />
                <span className="text-xs font-bold text-whiskey-gold uppercase tracking-wider">あなたのウイスキータイプ</span>
              </div>
              <h2 className="text-2xl font-bold text-whiskey-gold">{dashboard.aiAnalysis.personality_title}</h2>
              <p className="text-whiskey-text text-sm leading-relaxed">{dashboard.aiAnalysis.personality_description}</p>
              <div className="space-y-2 pt-1">
                <div className="flex items-start gap-2">
                  <Award size={14} className="text-whiskey-gold/70 mt-0.5 flex-shrink-0" />
                  <p className="text-whiskey-muted text-xs">{dashboard.aiAnalysis.strength}</p>
                </div>
                <div className="flex items-start gap-2">
                  <Compass size={14} className="text-whiskey-gold/70 mt-0.5 flex-shrink-0" />
                  <p className="text-whiskey-muted text-xs">{dashboard.aiAnalysis.next_challenge}</p>
                </div>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="glass-card p-3 text-center space-y-1">
              <Wine size={18} className="text-whiskey-gold mx-auto" />
              <p className="text-lg font-bold text-whiskey-text">{dashboard?.total || stats.total}</p>
              <p className="text-xs text-whiskey-muted">記録数</p>
            </div>
            <div className="glass-card p-3 text-center space-y-1">
              <Star size={18} className="text-whiskey-gold mx-auto" />
              <p className="text-lg font-bold text-whiskey-text">{dashboard?.avgRating || stats.avgRating}</p>
              <p className="text-xs text-whiskey-muted">平均評価</p>
            </div>
            <div className="glass-card p-3 text-center space-y-1">
              <MapPin size={18} className="text-whiskey-gold mx-auto" />
              <p className="text-lg font-bold text-whiskey-text">{dashboard?.regionBreakdown.length || stats.uniqueRegions}</p>
              <p className="text-xs text-whiskey-muted">産地数</p>
            </div>
          </div>

          {/* Taste Profile */}
          {preferences && preferences.total_tastings >= 2 && (preferences.top_flavors.length > 0 || preferences.top_regions.length > 0) && (
            <div className="glass-card p-4 space-y-3">
              <h2 className="text-sm font-bold text-whiskey-gold">あなたの好み</h2>
              {preferences.top_flavors.length > 0 && (
                <div>
                  <p className="text-xs text-whiskey-muted mb-1.5">フレーバー</p>
                  <div className="flex flex-wrap gap-1.5">
                    {preferences.top_flavors.map((f) => (<span key={f} className="glass-tag px-2 py-0.5 text-whiskey-gold text-xs">{f}</span>))}
                  </div>
                </div>
              )}
              {preferences.top_regions.length > 0 && (
                <div>
                  <p className="text-xs text-whiskey-muted mb-1.5">産地</p>
                  <div className="flex flex-wrap gap-1.5">
                    {preferences.top_regions.map((r) => (<span key={r} className="glass-tag px-2 py-0.5 text-whiskey-gold text-xs">{r}</span>))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Recent Records */}
          {recentRecords.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-whiskey-gold">最近の記録</h2>
                <Link href="/collection" className="text-xs text-whiskey-muted hover:text-whiskey-gold">すべて見る →</Link>
              </div>
              {recentRecords.map((record) => (
                <Link key={record.id} href={`/collection/${record.id}`} className="block glass-card p-3 active:scale-[0.98]">
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
                </Link>
              ))}
            </div>
          )}

          {/* Rating Distribution */}
          {dashboard && (
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
          )}

          {/* Top Flavors */}
          {dashboard && dashboard.topFlavors.length > 0 && (
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
          {dashboard && dashboard.favorites.length > 0 && (
            <div className="glass-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Award size={16} className="text-whiskey-gold" />
                <h2 className="text-sm font-bold text-whiskey-gold">お気に入り TOP5</h2>
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
          {dashboard && dashboard.ratingTrend.length > 1 && (
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

          {/* AI Suggestions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-whiskey-gold flex items-center gap-1.5">
                <Sparkles size={14} />
                AIおすすめ
              </h2>
              {suggestData && (
                <button onClick={fetchSuggestions} disabled={suggestLoading} className="text-whiskey-muted hover:text-whiskey-gold" aria-label="更新">
                  <RefreshCw size={14} className={suggestLoading ? "animate-spin" : ""} />
                </button>
              )}
            </div>
            {!suggestData && !suggestLoading && !suggestError && (
              <button
                onClick={fetchSuggestions}
                className="w-full glass-card-gold p-4 flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <Sparkles size={16} className="text-whiskey-gold" />
                <span className="text-sm font-bold text-whiskey-gold">AIにおすすめを聞く</span>
              </button>
            )}
            {suggestLoading && !suggestData && (
              <div className="glass-card p-6 flex flex-col items-center gap-3">
                <Loader2 size={24} className="animate-spin text-whiskey-gold" />
                <p className="text-whiskey-muted text-xs">AIがあなたの好みを分析中...</p>
              </div>
            )}
            {suggestError && !suggestData && (
              <div className="glass-card p-4 text-center space-y-3">
                <p className="text-whiskey-muted text-sm">{suggestError}</p>
              </div>
            )}
            {suggestData && (
              <>
                {suggestData.taste_profile.tendency && (
                  <div className="glass-card-gold p-3">
                    <p className="text-whiskey-text text-sm leading-relaxed">{suggestData.taste_profile.tendency}</p>
                  </div>
                )}
                {suggestData.suggestions.map((suggestion, index) => (
                  <div key={index} className="glass-card p-4 space-y-2.5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-whiskey-text text-sm">{suggestion.name}</h3>
                        <p className="text-xs text-whiskey-muted">{[suggestion.distillery, suggestion.region, suggestion.type].filter(Boolean).join(" / ")}</p>
                      </div>
                      <div className="flex-shrink-0 ml-2">
                        <div className="glass-tag !rounded-lg px-2 py-0.5 text-center">
                          <span className="text-whiskey-gold font-bold text-xs">{suggestion.match_score}%</span>
                          <p className="text-[9px] text-whiskey-muted">マッチ</p>
                        </div>
                      </div>
                    </div>
                    {suggestion.flavor_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {suggestion.flavor_tags.map((tag) => {
                          const isMatch = suggestData.taste_profile.top_flavors.includes(tag);
                          return (
                            <span key={tag} className={`px-1.5 py-0.5 text-[11px] rounded-full border ${isMatch ? "bg-whiskey-gold/20 text-whiskey-gold border-whiskey-gold/40" : "bg-whiskey-gold/5 text-whiskey-muted border-whiskey-border"}`}>
                              {tag}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    <p className="text-whiskey-muted text-xs leading-relaxed">{suggestion.reason}</p>
                  </div>
                ))}
              </>
            )}
          </div>

        </div>
      )}

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full glass-card !border-red-200 text-whiskey-muted py-3 hover:text-red-500 flex items-center justify-center gap-2 active:scale-[0.98]"
      >
        <LogOut size={16} />
        ログアウト
      </button>
    </div>
  );
}
