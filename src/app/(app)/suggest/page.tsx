"use client";

import { useState, useEffect } from "react";
import { Sparkles, Loader2, RefreshCw, Crown } from "lucide-react";
import Link from "next/link";

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

export default function SuggestPage() {
  const [data, setData] = useState<SuggestResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [totalTastings, setTotalTastings] = useState(0);
  const [needsUpgrade, setNeedsUpgrade] = useState(false);

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/suggest");
      const result = await response.json();

      if (!response.ok) {
        if (result.total_tastings !== undefined) {
          setTotalTastings(result.total_tastings);
        }
        if (result.upgrade) {
          setNeedsUpgrade(true);
        }
        setError(result.error);
        return;
      }

      setData(result);
    } catch {
      setError("おすすめの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-4 space-y-6 animate-fadeIn">
        <h1 className="text-xl font-bold text-whiskey-text">おすすめ</h1>
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="w-16 h-16 rounded-full glass-card flex items-center justify-center animate-pulse-glow">
            <Sparkles size={28} className="text-whiskey-gold" />
          </div>
          <Loader2 size={32} className="animate-spin text-whiskey-gold" />
          <p className="text-whiskey-muted text-sm">
            AIがあなたの好みを分析中...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-4 space-y-6 animate-fadeIn">
        <h1 className="text-xl font-bold text-whiskey-text">おすすめ</h1>
        <div className="flex flex-col items-center gap-4 py-12 animate-fadeInScale">
          <div className="w-20 h-20 rounded-full glass-card flex items-center justify-center animate-float">
            <Sparkles size={32} className="text-whiskey-muted" />
          </div>
          <p className="text-whiskey-muted text-center text-sm">{error}</p>

          {needsUpgrade && (
            <Link
              href="/plan"
              className="inline-flex items-center gap-2 glass-button text-whiskey-bg font-bold px-6 py-2.5 text-sm active:scale-90 transition-transform"
            >
              <Crown size={16} />
              プレミアムにアップグレード
            </Link>
          )}

          {!needsUpgrade && totalTastings < 2 && (
            <div className="space-y-3 text-center">
              <div className="flex items-center justify-center gap-2">
                {[0, 1].map((i) => (
                  <div
                    key={i}
                    className={`w-8 h-2 rounded-full transition-all duration-500 ${
                      i < totalTastings
                        ? "bg-whiskey-gold"
                        : "bg-whiskey-border/50"
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-whiskey-muted">
                {totalTastings}/2 記録完了
              </p>
              <Link
                href="/record"
                className="inline-block glass-button text-whiskey-bg font-bold px-6 py-2.5 text-sm active:scale-90 transition-transform"
              >
                ウイスキーを記録する
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="py-4 space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-whiskey-text">おすすめ</h1>
        <button
          onClick={fetchSuggestions}
          className="text-whiskey-muted hover:text-whiskey-gold transition-all duration-300 active:scale-75 active:rotate-180"
          aria-label="更新"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Taste Profile */}
      <div className="glass-card-gold p-4 space-y-3">
        <h2 className="text-sm font-bold text-whiskey-gold">
          あなたの好み傾向
        </h2>

        {data.taste_profile.tendency && (
          <p className="text-whiskey-text text-sm">
            {data.taste_profile.tendency}
          </p>
        )}

        {data.taste_profile.top_flavors.length > 0 && (
          <div>
            <p className="text-xs text-whiskey-muted mb-1.5">好みフレーバー</p>
            <div className="flex flex-wrap gap-1.5">
              {data.taste_profile.top_flavors.map((f) => (
                <span key={f} className="glass-tag">
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}

        {data.taste_profile.preferred_regions.length > 0 && (
          <div>
            <p className="text-xs text-whiskey-muted mb-1.5">好み産地</p>
            <div className="flex flex-wrap gap-1.5">
              {data.taste_profile.preferred_regions.map((r) => (
                <span key={r} className="glass-tag">
                  {r}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Suggestions */}
      <div className="space-y-3 stagger-children">
        <h2 className="text-sm font-bold text-whiskey-gold">
          おすすめウイスキー
        </h2>
        {data.suggestions.map((suggestion, index) => (
          <div
            key={index}
            className="glass-card p-4 space-y-3 active:scale-[0.98] transition-transform duration-200"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-bold text-whiskey-text">
                  {suggestion.name}
                </h3>
                <p className="text-xs text-whiskey-muted">
                  {[suggestion.distillery, suggestion.region, suggestion.type]
                    .filter(Boolean)
                    .join(" / ")}
                </p>
              </div>
              <div className="flex-shrink-0 ml-3">
                <div className="glass-card-gold !rounded-lg px-2 py-1 text-center">
                  <span className="text-whiskey-gold font-bold text-sm">
                    {suggestion.match_score}%
                  </span>
                  <p className="text-[10px] text-whiskey-muted">マッチ</p>
                </div>
              </div>
            </div>

            {/* Flavor Tags */}
            {suggestion.flavor_tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {suggestion.flavor_tags.map((tag) => {
                  const isMatch =
                    data.taste_profile.top_flavors.includes(tag);
                  return (
                    <span
                      key={tag}
                      className={`glass-tag ${
                        isMatch
                          ? "!bg-whiskey-gold/20 !border-whiskey-gold/40"
                          : "!bg-whiskey-gold/5 !text-whiskey-muted !border-whiskey-border"
                      }`}
                    >
                      {tag}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Reason */}
            <p className="text-whiskey-muted text-sm leading-relaxed">
              {suggestion.reason}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
