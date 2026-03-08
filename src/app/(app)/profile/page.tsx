"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Image from "next/image";
import {
  LogOut,
  Wine,
  Star,
  Loader2,
  Sparkles,
  TrendingUp,
  Award,
  Target,
  BarChart3,
  MapPin,
  Compass,
  Crown,
  Edit3,
  Camera,
  X,
  Check,
  Link as LinkIcon,
} from "lucide-react";

interface FlavorStat {
  name: string;
  count: number;
}

interface BreakdownItem {
  name: string;
  count: number;
  avgRating: number;
}

interface Favorite {
  name: string;
  rating: number;
  type: string | null;
  region: string | null;
}

interface RatingTrendItem {
  month: string;
  avgRating: number;
  count: number;
}

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
  bio: string;
  avatar_url: string;
  website: string;
  twitter: string;
  instagram: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<Partial<ProfileData>>({});
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [profileRes, dashboardRes] = await Promise.all([
        fetch("/api/profile"),
        fetch("/api/dashboard"),
      ]);

      if (profileRes.ok) {
        const p = await profileRes.json();
        setProfile(p);
        setEditForm(p);
      }
      if (dashboardRes.ok) {
        setDashboard(await dashboardRes.json());
      }
    } catch (err) {
      console.error("Profile fetch error:", err);
    } finally {
      setLoading(false);
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
    } catch {
      // ignore
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
      formData.append(
        "file",
        new File([file], `avatar_${Date.now()}.jpg`, { type: file.type })
      );

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (uploadRes.ok) {
        const { url } = await uploadRes.json();
        setEditForm((prev) => ({ ...prev, avatar_url: url }));

        // Save immediately
        await fetch("/api/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatar_url: url }),
        });
        setProfile((prev) => prev ? { ...prev, avatar_url: url } : prev);
      }
    } catch {
      // ignore
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
      <div className="py-8 flex justify-center">
        <Loader2 size={32} className="animate-spin text-whiskey-gold" />
      </div>
    );
  }

  const displayName = profile?.display_name || profile?.full_name || "";
  const email = profile?.email || "";

  const maxFlavorCount = dashboard
    ? Math.max(...dashboard.topFlavors.map((f) => f.count), 1)
    : 1;
  const maxRatingCount = dashboard
    ? Math.max(
        ...Object.values(dashboard.ratingDistribution).map(Number),
        1
      )
    : 1;

  return (
    <div className="py-4 space-y-5 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-whiskey-text">マイページ</h1>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 glass-tag px-3 py-1.5 text-whiskey-gold text-xs font-bold active:scale-95 transition-transform"
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
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-whiskey-border/50">
              <button
                onClick={() => { setEditing(false); setEditForm(profile || {}); }}
                className="text-whiskey-muted hover:text-whiskey-text transition-all duration-200"
              >
                <X size={20} />
              </button>
              <h3 className="text-sm font-bold text-whiskey-text">
                プロフィール編集
              </h3>
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="text-whiskey-gold font-bold text-sm flex items-center gap-1 active:scale-90 transition-transform disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                保存
              </button>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* Avatar */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full overflow-hidden glass-card flex items-center justify-center animate-pulse-glow">
                    {editForm.avatar_url ? (
                      <Image
                        src={editForm.avatar_url}
                        alt="プロフィール画像"
                        width={96}
                        height={96}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-whiskey-gold font-bold text-3xl">
                        {(displayName || email).charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full glass-button text-whiskey-bg flex items-center justify-center active:scale-90 transition-transform"
                  >
                    {uploadingAvatar ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Camera size={14} />
                    )}
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs text-whiskey-muted mb-1.5">表示名</label>
                <input
                  type="text"
                  value={editForm.display_name || ""}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, display_name: e.target.value }))}
                  placeholder="ニックネーム"
                  className="w-full glass-input px-3 py-2.5 text-sm text-whiskey-text placeholder:text-whiskey-muted/50"
                />
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs text-whiskey-muted mb-1.5">名前</label>
                <input
                  type="text"
                  value={editForm.full_name || ""}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, full_name: e.target.value }))}
                  placeholder="お名前"
                  className="w-full glass-input px-3 py-2.5 text-sm text-whiskey-text placeholder:text-whiskey-muted/50"
                />
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs text-whiskey-muted mb-1.5">自己紹介</label>
                <textarea
                  value={editForm.bio || ""}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, bio: e.target.value }))}
                  placeholder="ウイスキーへの想いなど..."
                  className="w-full glass-input px-3 py-2.5 text-sm text-whiskey-text placeholder:text-whiskey-muted/50 min-h-[80px] resize-none"
                />
              </div>

              {/* Links */}
              <div className="space-y-3">
                <label className="block text-xs text-whiskey-muted">リンク</label>
                <div className="relative">
                  <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-whiskey-muted" />
                  <input
                    type="url"
                    value={editForm.website || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, website: e.target.value }))}
                    placeholder="https://example.com"
                    className="w-full glass-input pl-9 pr-3 py-2.5 text-sm text-whiskey-text placeholder:text-whiskey-muted/50"
                  />
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-whiskey-muted text-xs">𝕏</span>
                  <input
                    type="text"
                    value={editForm.twitter || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, twitter: e.target.value }))}
                    placeholder="@username"
                    className="w-full glass-input pl-9 pr-3 py-2.5 text-sm text-whiskey-text placeholder:text-whiskey-muted/50"
                  />
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-whiskey-muted text-xs">IG</span>
                  <input
                    type="text"
                    value={editForm.instagram || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, instagram: e.target.value }))}
                    placeholder="@username"
                    className="w-full glass-input pl-9 pr-3 py-2.5 text-sm text-whiskey-text placeholder:text-whiskey-muted/50"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Card */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden glass-card-gold flex items-center justify-center flex-shrink-0 animate-pulse-glow">
            {profile?.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt="プロフィール画像"
                width={64}
                height={64}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-whiskey-gold font-bold text-2xl">
                {(displayName || email).charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            {displayName && (
              <p className="text-base font-bold text-whiskey-text truncate">{displayName}</p>
            )}
            <p className="text-xs text-whiskey-muted truncate">{email}</p>
            {profile?.bio && (
              <p className="text-xs text-whiskey-text/80 mt-1 line-clamp-2">{profile.bio}</p>
            )}
            {/* Links */}
            {(profile?.website || profile?.twitter || profile?.instagram) && (
              <div className="flex items-center gap-3 mt-2">
                {profile?.website && (
                  <a href={profile.website} target="_blank" rel="noopener noreferrer"
                    className="text-whiskey-gold/60 hover:text-whiskey-gold transition-colors">
                    <LinkIcon size={14} />
                  </a>
                )}
                {profile?.twitter && (
                  <a href={`https://x.com/${profile.twitter.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
                    className="text-whiskey-gold/60 hover:text-whiskey-gold transition-colors text-xs font-bold">
                    𝕏
                  </a>
                )}
                {profile?.instagram && (
                  <a href={`https://instagram.com/${profile.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
                    className="text-whiskey-gold/60 hover:text-whiskey-gold transition-colors text-xs font-bold">
                    IG
                  </a>
                )}
              </div>
            )}
            {dashboard && (
              <p className="text-xs text-whiskey-muted mt-1">
                {dashboard.total}本のウイスキーを記録
              </p>
            )}
          </div>
        </div>
      </div>

      {dashboard && dashboard.total > 0 ? (
        <div className="space-y-5 stagger-children">
          {/* AI Personality Card */}
          {dashboard.aiAnalysis && (
            <div className="glass-card-gold p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-whiskey-gold" />
                <span className="text-xs font-bold text-whiskey-gold uppercase tracking-wider">
                  あなたのウイスキータイプ
                </span>
              </div>
              <h2 className="text-2xl font-bold text-whiskey-gold">
                {dashboard.aiAnalysis.personality_title}
              </h2>
              <p className="text-whiskey-text text-sm leading-relaxed">
                {dashboard.aiAnalysis.personality_description}
              </p>
              <div className="space-y-2 pt-1">
                <div className="flex items-start gap-2">
                  <Award size={14} className="text-whiskey-gold/70 mt-0.5 flex-shrink-0" />
                  <p className="text-whiskey-muted text-xs">
                    {dashboard.aiAnalysis.strength}
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Compass size={14} className="text-whiskey-gold/70 mt-0.5 flex-shrink-0" />
                  <p className="text-whiskey-muted text-xs">
                    {dashboard.aiAnalysis.next_challenge}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="glass-card p-3 text-center space-y-1">
              <Wine size={18} className="text-whiskey-gold mx-auto" />
              <p className="text-lg font-bold text-whiskey-text">
                {dashboard.total}
              </p>
              <p className="text-xs text-whiskey-muted">記録数</p>
            </div>
            <div className="glass-card p-3 text-center space-y-1">
              <Star size={18} className="text-whiskey-gold mx-auto" />
              <p className="text-lg font-bold text-whiskey-text">
                {dashboard.avgRating}
              </p>
              <p className="text-xs text-whiskey-muted">平均評価</p>
            </div>
            <div className="glass-card p-3 text-center space-y-1">
              <MapPin size={18} className="text-whiskey-gold mx-auto" />
              <p className="text-lg font-bold text-whiskey-text">
                {dashboard.regionBreakdown.length}
              </p>
              <p className="text-xs text-whiskey-muted">産地数</p>
            </div>
          </div>

          {/* Rating Distribution */}
          <div className="glass-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-whiskey-gold" />
              <h2 className="text-sm font-bold text-whiskey-gold">
                評価の分布
              </h2>
            </div>
            <div className="space-y-1.5">
              {Array.from({ length: 10 }, (_, i) => {
                const rating = 10 - i;
                const count = dashboard.ratingDistribution[rating] || 0;
                const width =
                  maxRatingCount > 0
                    ? Math.round((count / maxRatingCount) * 100)
                    : 0;
                return (
                  <div key={rating} className="flex items-center gap-2">
                    <span className="text-xs text-whiskey-muted w-5 text-right">
                      {rating}
                    </span>
                    <div className="flex-1 h-4 bg-whiskey-bg/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-whiskey-gold/40 to-whiskey-gold/70 rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <span className="text-xs text-whiskey-muted w-5">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Flavors */}
          {dashboard.topFlavors.length > 0 && (
            <div className="glass-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Target size={16} className="text-whiskey-gold" />
                <h2 className="text-sm font-bold text-whiskey-gold">
                  好みフレーバー TOP{Math.min(dashboard.topFlavors.length, 8)}
                </h2>
              </div>
              <div className="space-y-2">
                {dashboard.topFlavors.map((flavor, i) => (
                  <div key={flavor.name} className="flex items-center gap-2">
                    <span className="text-xs text-whiskey-gold/60 w-4">
                      {i + 1}
                    </span>
                    <span className="text-sm text-whiskey-text w-24 truncate">
                      {flavor.name}
                    </span>
                    <div className="flex-1 h-3 bg-whiskey-bg/50 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${Math.round((flavor.count / maxFlavorCount) * 100)}%`,
                          background:
                            i === 0
                              ? "linear-gradient(90deg, rgba(212,175,55,0.6), rgba(212,175,55,1))"
                              : i === 1
                                ? "linear-gradient(90deg, rgba(212,175,55,0.4), rgba(212,175,55,0.7))"
                                : i === 2
                                  ? "linear-gradient(90deg, rgba(212,175,55,0.3), rgba(212,175,55,0.5))"
                                  : "linear-gradient(90deg, rgba(212,175,55,0.2), rgba(212,175,55,0.3))",
                        }}
                      />
                    </div>
                    <span className="text-xs text-whiskey-muted w-5 text-right">
                      {flavor.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Type & Region Breakdown */}
          <div className="grid grid-cols-1 gap-4">
            {dashboard.typeBreakdown.length > 0 && (
              <div className="glass-card p-4 space-y-3">
                <h2 className="text-sm font-bold text-whiskey-gold">
                  タイプ別
                </h2>
                <div className="space-y-2">
                  {dashboard.typeBreakdown.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-whiskey-text">
                          {item.name}
                        </span>
                        <span className="text-xs text-whiskey-muted">
                          ({item.count}本)
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star size={12} className="text-whiskey-gold" />
                        <span className="text-sm font-medium text-whiskey-text">
                          {item.avgRating}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {dashboard.regionBreakdown.length > 0 && (
              <div className="glass-card p-4 space-y-3">
                <h2 className="text-sm font-bold text-whiskey-gold">
                  産地別
                </h2>
                <div className="space-y-2">
                  {dashboard.regionBreakdown.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-whiskey-text">
                          {item.name}
                        </span>
                        <span className="text-xs text-whiskey-muted">
                          ({item.count}本)
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star size={12} className="text-whiskey-gold" />
                        <span className="text-sm font-medium text-whiskey-text">
                          {item.avgRating}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Favorites */}
          {dashboard.favorites.length > 0 && (
            <div className="glass-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Award size={16} className="text-whiskey-gold" />
                <h2 className="text-sm font-bold text-whiskey-gold">
                  お気に入り TOP5
                </h2>
              </div>
              <div className="space-y-2">
                {dashboard.favorites.map((fav, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 py-1"
                  >
                    <span className="text-lg font-bold text-whiskey-gold/40 w-6 text-center">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-whiskey-text truncate">
                        {fav.name}
                      </p>
                      <p className="text-xs text-whiskey-muted">
                        {[fav.type, fav.region].filter(Boolean).join(" / ")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Star size={12} className="text-whiskey-gold fill-whiskey-gold" />
                      <span className="text-sm font-bold text-whiskey-gold">
                        {fav.rating}
                      </span>
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
                <h2 className="text-sm font-bold text-whiskey-gold">
                  評価の推移
                </h2>
              </div>
              <div className="flex items-end gap-1 h-24">
                {dashboard.ratingTrend.map((item) => {
                  const height = Math.round((item.avgRating / 10) * 100);
                  return (
                    <div
                      key={item.month}
                      className="flex-1 flex flex-col items-center gap-1"
                    >
                      <span className="text-[10px] text-whiskey-muted">
                        {item.avgRating}
                      </span>
                      <div
                        className="w-full bg-gradient-to-t from-whiskey-gold/30 to-whiskey-gold/60 rounded-t transition-all duration-700 ease-out"
                        style={{
                          height: `${height}%`,
                          minHeight: "4px",
                        }}
                      />
                      <span className="text-[9px] text-whiskey-muted truncate w-full text-center">
                        {item.month.substring(5)}月
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Link to Suggest */}
          <Link
            href="/suggest"
            className="block glass-card-gold p-4 hover:scale-[1.01] active:scale-[0.99] transition-transform duration-200"
          >
            <div className="flex items-center gap-3">
              <Sparkles size={20} className="text-whiskey-gold" />
              <div>
                <p className="text-sm font-bold text-whiskey-gold">
                  AIおすすめを見る
                </p>
                <p className="text-xs text-whiskey-muted">
                  あなたの好みに合うウイスキーをAIが提案
                </p>
              </div>
            </div>
          </Link>
        </div>
      ) : (
        <div className="glass-card p-6 text-center space-y-3 animate-fadeInScale">
          <Wine size={32} className="text-whiskey-muted mx-auto animate-float" />
          <p className="text-whiskey-muted text-sm">
            ウイスキーを記録して、あなたの好みを分析しましょう
          </p>
          <Link
            href="/record"
            className="inline-block glass-button text-whiskey-bg font-bold px-6 py-2.5 text-sm"
          >
            最初の1本を記録する
          </Link>
        </div>
      )}

      {/* Plan Link */}
      <Link
        href="/plan"
        className="block glass-card p-4 hover:scale-[1.01] active:scale-[0.99] transition-transform duration-200"
      >
        <div className="flex items-center gap-3">
          <Crown size={20} className="text-whiskey-gold" />
          <div>
            <p className="text-sm font-bold text-whiskey-text">プラン・課金</p>
            <p className="text-xs text-whiskey-muted">
              AI機能を無制限に使うなら月500円
            </p>
          </div>
        </div>
      </Link>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full glass-card !border-red-900/20 text-whiskey-muted py-3 hover:text-red-400 transition-all duration-300 flex items-center justify-center gap-2 active:scale-[0.98]"
      >
        <LogOut size={16} />
        ログアウト
      </button>
    </div>
  );
}
