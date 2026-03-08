"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Camera, Wine, Star, MapPin, Loader2, Trophy } from "lucide-react";
import Image from "next/image";

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

interface Stats {
  total: number;
  avgRating: number;
  uniqueRegions: number;
  uniqueTypes: number;
  uniqueFlavors: number;
  highRatedCount: number;
  shareCount: number;
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
  let xp = 0;
  xp += stats.total * 10;           // 1記録 = 10XP
  xp += stats.uniqueRegions * 20;   // 新しい産地 = 20XP
  xp += stats.uniqueTypes * 20;     // 新しいタイプ = 20XP
  xp += stats.uniqueFlavors * 5;    // フレーバー多様性 = 5XP
  xp += stats.highRatedCount * 5;   // 高評価(8+) = +5XP
  xp += stats.shareCount * 15;      // シェア = 15XP
  return xp;
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

export default function HomePage() {
  const [recentRecords, setRecentRecords] = useState<TastingRecord[]>([]);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    avgRating: 0,
    uniqueRegions: 0,
    uniqueTypes: 0,
    uniqueFlavors: 0,
    highRatedCount: 0,
    shareCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showXpDetail, setShowXpDetail] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [recordsRes, prefsRes, sharesRes] = await Promise.all([
        fetch("/api/records?limit=3&page=1"),
        fetch("/api/preferences"),
        fetch("/api/shares"),
      ]);

      let shareCount = 0;
      if (sharesRes.ok) {
        const sharesData = await sharesRes.json();
        shareCount = sharesData.count || 0;
      }

      if (recordsRes.ok) {
        const recordsData = await recordsRes.json();
        setRecentRecords(recordsData.records || []);

        // Calculate stats from all records
        const allRes = await fetch("/api/records?limit=1000&page=1");
        if (allRes.ok) {
          const allData = await allRes.json();
          const records: TastingRecord[] = allData.records || [];
          const regions = new Set(
            records.map((r) => r.region).filter(Boolean)
          );
          const types = new Set(
            records.map((r) => r.type).filter(Boolean)
          );
          const flavors = new Set(
            records.flatMap((r) => r.flavor_tags || [])
          );
          const highRated = records.filter((r) => r.rating >= 8).length;
          const avgR =
            records.length > 0
              ? records.reduce((sum, r) => sum + r.rating, 0) / records.length
              : 0;

          setStats({
            total: allData.total || records.length,
            avgRating: Math.round(avgR * 10) / 10,
            uniqueRegions: regions.size,
            uniqueTypes: types.size,
            uniqueFlavors: flavors.size,
            highRatedCount: highRated,
            shareCount,
          });
        }
      }

      if (prefsRes.ok) {
        const prefsData = await prefsRes.json();
        setPreferences(prefsData);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-8 flex justify-center">
        <Loader2 size={32} className="animate-spin text-whiskey-gold" />
      </div>
    );
  }

  const xp = calcXp(stats);
  const level = getLevel(xp);
  const xpBreakdown = getXpBreakdown(stats);

  return (
    <div className="py-4 space-y-6">
      {/* Welcome / CTA */}
      {stats.total === 0 ? (
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="w-24 h-24 rounded-full bg-whiskey-card border-2 border-whiskey-border flex items-center justify-center">
            <Wine size={40} className="text-whiskey-gold" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-lg font-bold text-whiskey-text">
              ようこそ、ウイスキーノミタイへ
            </h2>
            <p className="text-whiskey-muted text-sm">
              ボトルを撮影して、あなただけの
              <br />
              ウイスキージャーナルを始めましょう
            </p>
          </div>
          <Link
            href="/record"
            className="bg-whiskey-gold hover:bg-whiskey-gold-dark text-whiskey-bg font-bold px-8 py-3 rounded-lg transition-colors flex items-center gap-2"
          >
            <Camera size={18} />
            最初の一杯を記録する
          </Link>
        </div>
      ) : (
        <>
          {/* Level Card */}
          <div
            className="bg-gradient-to-br from-whiskey-card to-whiskey-bg border border-whiskey-border rounded-xl p-4 space-y-3 cursor-pointer"
            onClick={() => setShowXpDetail(!showXpDetail)}
          >
            <div className="flex items-center gap-4">
              {/* Level Badge */}
              <div className="relative flex-shrink-0">
                <div className="w-16 h-16 rounded-full border-[3px] border-whiskey-gold flex items-center justify-center bg-whiskey-gold/10">
                  <div className="text-center">
                    <p className="text-whiskey-gold font-bold text-xs leading-none">Lv.</p>
                    <p className="text-whiskey-gold font-bold text-xl leading-none">
                      {level.level}
                    </p>
                  </div>
                </div>
                {/* Small trophy for high levels */}
                {level.level >= 5 && (
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-whiskey-gold rounded-full flex items-center justify-center">
                    <Trophy size={12} className="text-whiskey-bg" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-whiskey-gold font-bold text-lg">
                  {level.title}
                </p>
                <p className="text-whiskey-muted text-xs">
                  {xp} XP
                  {level.next && ` / 次のレベルまで ${level.next.minXp - xp} XP`}
                </p>

                {/* XP Progress Bar */}
                <div className="mt-2 h-2 bg-whiskey-bg rounded-full overflow-hidden border border-whiskey-border">
                  <div
                    className="h-full bg-gradient-to-r from-whiskey-gold/70 to-whiskey-gold rounded-full transition-all duration-700"
                    style={{ width: `${level.progressToNext}%` }}
                  />
                </div>
                {level.next && (
                  <p className="text-[10px] text-whiskey-muted mt-1">
                    次: Lv.{level.next.level} {level.next.title}
                  </p>
                )}
              </div>
            </div>

            {/* XP Breakdown (toggle) */}
            {showXpDetail && (
              <div className="pt-2 border-t border-whiskey-border space-y-1.5">
                <p className="text-xs text-whiskey-muted font-bold">XP内訳</p>
                {xpBreakdown.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-whiskey-muted">{item.label}</span>
                    <span className="text-whiskey-text">
                      <span className="text-whiskey-muted mr-2">
                        {item.detail}
                      </span>
                      <span className="text-whiskey-gold font-bold">
                        +{item.value}
                      </span>
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

          {/* CTA Banner */}
          <Link
            href="/record"
            className="block bg-whiskey-card border border-whiskey-border rounded-lg p-4 hover:border-whiskey-gold/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-whiskey-gold/10 flex items-center justify-center flex-shrink-0">
                <Camera size={20} className="text-whiskey-gold" />
              </div>
              <div>
                <p className="text-sm font-bold text-whiskey-text">
                  ボトルを撮影して記録する
                </p>
                <p className="text-xs text-whiskey-muted">
                  AIが自動でウイスキーを識別します
                </p>
              </div>
            </div>
          </Link>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              icon={<Wine size={18} />}
              label="記録数"
              value={stats.total.toString()}
            />
            <StatCard
              icon={<Star size={18} />}
              label="平均評価"
              value={stats.avgRating.toString()}
            />
            <StatCard
              icon={<MapPin size={18} />}
              label="産地数"
              value={stats.uniqueRegions.toString()}
            />
          </div>

          {/* Taste Profile */}
          {preferences &&
            preferences.total_tastings >= 2 &&
            (preferences.top_flavors.length > 0 ||
              preferences.top_regions.length > 0) && (
              <div className="bg-whiskey-card border border-whiskey-border rounded-lg p-4 space-y-3">
                <h2 className="text-sm font-bold text-whiskey-gold">
                  あなたの好み
                </h2>
                {preferences.top_flavors.length > 0 && (
                  <div>
                    <p className="text-xs text-whiskey-muted mb-1.5">
                      フレーバー
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
                    <p className="text-xs text-whiskey-muted mb-1.5">産地</p>
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
              </div>
            )}

          {/* Recent Records */}
          {recentRecords.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-whiskey-gold">
                  最近の記録
                </h2>
                <Link
                  href="/collection"
                  className="text-xs text-whiskey-muted hover:text-whiskey-gold transition-colors"
                >
                  すべて見る →
                </Link>
              </div>
              {recentRecords.map((record) => (
                <Link
                  key={record.id}
                  href={`/collection/${record.id}`}
                  className="block bg-whiskey-card border border-whiskey-border rounded-lg p-3 hover:border-whiskey-gold/30 transition-colors"
                >
                  <div className="flex gap-3">
                    {record.photo_url ? (
                      <Image
                        src={record.photo_url}
                        alt={record.name}
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-whiskey-border flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-whiskey-text truncate">
                        {record.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-whiskey-gold text-xs font-bold">
                          {record.rating}/10
                        </span>
                        <span className="text-whiskey-muted text-xs">
                          {new Date(record.created_at).toLocaleDateString(
                            "ja-JP"
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-whiskey-card border border-whiskey-border rounded-lg p-3 text-center space-y-1">
      <div className="text-whiskey-gold flex justify-center">{icon}</div>
      <p className="text-lg font-bold text-whiskey-text">{value}</p>
      <p className="text-xs text-whiskey-muted">{label}</p>
    </div>
  );
}
