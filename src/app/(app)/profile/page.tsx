"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogOut, Wine, Star, MapPin, Loader2 } from "lucide-react";

interface Preferences {
  top_flavors: string[];
  top_regions: string[];
  preferred_types: string[];
  avg_rating: number;
  total_tastings: number;
}

export default function ProfilePage() {
  const [email, setEmail] = useState("");
  const [preferences, setPreferences] = useState<Preferences | null>(null);
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
      }

      const prefsRes = await fetch("/api/preferences");
      if (prefsRes.ok) {
        setPreferences(await prefsRes.json());
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

  return (
    <div className="py-4 space-y-6">
      <h1 className="text-xl font-bold text-whiskey-text">プロフィール</h1>

      {/* User Info */}
      <div className="bg-whiskey-card border border-whiskey-border rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-whiskey-gold/10 border border-whiskey-gold/20 flex items-center justify-center">
            <span className="text-whiskey-gold font-bold text-lg">
              {email.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-sm text-whiskey-text">{email}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      {preferences && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-whiskey-card border border-whiskey-border rounded-lg p-3 text-center space-y-1">
            <Wine size={18} className="text-whiskey-gold mx-auto" />
            <p className="text-lg font-bold text-whiskey-text">
              {preferences.total_tastings}
            </p>
            <p className="text-xs text-whiskey-muted">記録数</p>
          </div>
          <div className="bg-whiskey-card border border-whiskey-border rounded-lg p-3 text-center space-y-1">
            <Star size={18} className="text-whiskey-gold mx-auto" />
            <p className="text-lg font-bold text-whiskey-text">
              {preferences.avg_rating}
            </p>
            <p className="text-xs text-whiskey-muted">平均評価</p>
          </div>
          <div className="bg-whiskey-card border border-whiskey-border rounded-lg p-3 text-center space-y-1">
            <MapPin size={18} className="text-whiskey-gold mx-auto" />
            <p className="text-lg font-bold text-whiskey-text">
              {preferences.top_regions.length}
            </p>
            <p className="text-xs text-whiskey-muted">産地数</p>
          </div>
        </div>
      )}

      {/* Taste Preferences */}
      {preferences &&
        preferences.total_tastings > 0 &&
        (preferences.top_flavors.length > 0 ||
          preferences.top_regions.length > 0 ||
          preferences.preferred_types.length > 0) && (
          <div className="bg-whiskey-card border border-whiskey-border rounded-lg p-4 space-y-3">
            <h2 className="text-sm font-bold text-whiskey-gold">
              好みプロファイル
            </h2>

            {preferences.top_flavors.length > 0 && (
              <div>
                <p className="text-xs text-whiskey-muted mb-1.5">
                  好みフレーバー
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {preferences.top_flavors.map((f) => (
                    <span
                      key={f}
                      className="px-2 py-0.5 bg-whiskey-gold/10 text-whiskey-gold text-xs rounded-full border border-whiskey-gold/20"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {preferences.top_regions.length > 0 && (
              <div>
                <p className="text-xs text-whiskey-muted mb-1.5">好み産地</p>
                <div className="flex flex-wrap gap-1.5">
                  {preferences.top_regions.map((r) => (
                    <span
                      key={r}
                      className="px-2 py-0.5 bg-whiskey-gold/10 text-whiskey-gold text-xs rounded-full border border-whiskey-gold/20"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {preferences.preferred_types.length > 0 && (
              <div>
                <p className="text-xs text-whiskey-muted mb-1.5">好みタイプ</p>
                <div className="flex flex-wrap gap-1.5">
                  {preferences.preferred_types.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 bg-whiskey-gold/10 text-whiskey-gold text-xs rounded-full border border-whiskey-gold/20"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

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
