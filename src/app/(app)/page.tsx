"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Camera, Wine, Star, MapPin, Loader2 } from "lucide-react";
import Image from "next/image";

interface TastingRecord {
  id: string;
  name: string;
  region: string | null;
  type: string | null;
  rating: number;
  photo_url: string | null;
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
}

export default function HomePage() {
  const [recentRecords, setRecentRecords] = useState<TastingRecord[]>([]);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    avgRating: 0,
    uniqueRegions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [recordsRes, prefsRes] = await Promise.all([
        fetch("/api/records?limit=3&page=1"),
        fetch("/api/preferences"),
      ]);

      if (recordsRes.ok) {
        const recordsData = await recordsRes.json();
        setRecentRecords(recordsData.records || []);

        // Calculate stats from all records
        const allRes = await fetch("/api/records?limit=1000&page=1");
        if (allRes.ok) {
          const allData = await allRes.json();
          const records = allData.records || [];
          const regions = new Set(
            records.map((r: TastingRecord) => r.region).filter(Boolean)
          );
          const avgR =
            records.length > 0
              ? records.reduce(
                  (sum: number, r: TastingRecord) => sum + r.rating,
                  0
                ) / records.length
              : 0;

          setStats({
            total: allData.total || records.length,
            avgRating: Math.round(avgR * 10) / 10,
            uniqueRegions: regions.size,
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
