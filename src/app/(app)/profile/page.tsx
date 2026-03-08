"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
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

export default function ProfilePage() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || "");
        setFullName(user.user_metadata?.full_name || "");
      }

      const res = await fetch("/api/dashboard");
      if (res.ok) {
        setDashboard(await res.json());
      }
    } catch (err) {
      console.error("Profile fetch error:", err);
    } finally {
      setLoading(false);
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
    <div className="py-4 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-whiskey-text">マイページ</h1>
      </div>

      {/* User Card */}
      <div className="bg-whiskey-card border border-whiskey-border rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-whiskey-gold/10 border border-whiskey-gold/20 flex items-center justify-center">
            <span className="text-whiskey-gold font-bold text-lg">
              {(fullName || email).charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1">
            {fullName && (
              <p className="text-sm font-bold text-whiskey-text">{fullName}</p>
            )}
            <p className="text-xs text-whiskey-muted">{email}</p>
            {dashboard && (
              <p className="text-xs text-whiskey-muted">
                {dashboard.total}本のウイスキーを記録
              </p>
            )}
          </div>
        </div>
      </div>

      {dashboard && dashboard.total > 0 ? (
        <>
          {/* AI Personality Card */}
          {dashboard.aiAnalysis && (
            <div className="bg-gradient-to-br from-whiskey-gold/10 to-whiskey-gold/5 border border-whiskey-gold/20 rounded-lg p-4 space-y-3">
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
            <div className="bg-whiskey-card border border-whiskey-border rounded-lg p-3 text-center space-y-1">
              <Wine size={18} className="text-whiskey-gold mx-auto" />
              <p className="text-lg font-bold text-whiskey-text">
                {dashboard.total}
              </p>
              <p className="text-xs text-whiskey-muted">記録数</p>
            </div>
            <div className="bg-whiskey-card border border-whiskey-border rounded-lg p-3 text-center space-y-1">
              <Star size={18} className="text-whiskey-gold mx-auto" />
              <p className="text-lg font-bold text-whiskey-text">
                {dashboard.avgRating}
              </p>
              <p className="text-xs text-whiskey-muted">平均評価</p>
            </div>
            <div className="bg-whiskey-card border border-whiskey-border rounded-lg p-3 text-center space-y-1">
              <MapPin size={18} className="text-whiskey-gold mx-auto" />
              <p className="text-lg font-bold text-whiskey-text">
                {dashboard.regionBreakdown.length}
              </p>
              <p className="text-xs text-whiskey-muted">産地数</p>
            </div>
          </div>

          {/* Rating Distribution */}
          <div className="bg-whiskey-card border border-whiskey-border rounded-lg p-4 space-y-3">
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
                    <div className="flex-1 h-4 bg-whiskey-bg rounded-full overflow-hidden">
                      <div
                        className="h-full bg-whiskey-gold/60 rounded-full transition-all duration-500"
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
            <div className="bg-whiskey-card border border-whiskey-border rounded-lg p-4 space-y-3">
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
                    <div className="flex-1 h-3 bg-whiskey-bg rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.round((flavor.count / maxFlavorCount) * 100)}%`,
                          backgroundColor:
                            i === 0
                              ? "rgb(212, 175, 55)"
                              : i === 1
                                ? "rgba(212, 175, 55, 0.7)"
                                : i === 2
                                  ? "rgba(212, 175, 55, 0.5)"
                                  : "rgba(212, 175, 55, 0.3)",
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
            {/* Type */}
            {dashboard.typeBreakdown.length > 0 && (
              <div className="bg-whiskey-card border border-whiskey-border rounded-lg p-4 space-y-3">
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

            {/* Region */}
            {dashboard.regionBreakdown.length > 0 && (
              <div className="bg-whiskey-card border border-whiskey-border rounded-lg p-4 space-y-3">
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
            <div className="bg-whiskey-card border border-whiskey-border rounded-lg p-4 space-y-3">
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
            <div className="bg-whiskey-card border border-whiskey-border rounded-lg p-4 space-y-3">
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
                        className="w-full bg-whiskey-gold/50 rounded-t transition-all duration-500"
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
            className="block bg-gradient-to-r from-whiskey-gold/20 to-whiskey-gold/10 border border-whiskey-gold/30 rounded-lg p-4 hover:from-whiskey-gold/30 hover:to-whiskey-gold/20 transition-all"
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
        </>
      ) : (
        <div className="bg-whiskey-card border border-whiskey-border rounded-lg p-6 text-center space-y-3">
          <Wine size={32} className="text-whiskey-muted mx-auto" />
          <p className="text-whiskey-muted text-sm">
            ウイスキーを記録して、あなたの好みを分析しましょう
          </p>
          <Link
            href="/record"
            className="inline-block bg-whiskey-gold hover:bg-whiskey-gold-dark text-whiskey-bg font-bold px-6 py-2.5 rounded-lg transition-colors text-sm"
          >
            最初の1本を記録する
          </Link>
        </div>
      )}

      {/* Plan Link */}
      <Link
        href="/plan"
        className="block bg-whiskey-card border border-whiskey-border rounded-lg p-4 hover:border-whiskey-gold/30 transition-colors"
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
        className="w-full border border-whiskey-border text-whiskey-muted py-3 rounded-lg hover:bg-whiskey-card hover:text-red-400 transition-colors flex items-center justify-center gap-2"
      >
        <LogOut size={16} />
        ログアウト
      </button>
    </div>
  );
}
