"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Crown,
  Check,
  X,
  Loader2,
  Camera,
  Sparkles,
  Search,
  Star,
} from "lucide-react";
import Link from "next/link";

interface AiUsageStatus {
  canUse: boolean;
  isPremium: boolean;
  usedThisMonth: number;
  remaining: number;
  plan: string;
}

export default function PlanPage() {
  const [usage, setUsage] = useState<AiUsageStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchUsage();
  }, []);

  const fetchUsage = async () => {
    try {
      const res = await fetch("/api/ai-usage");
      if (res.ok) {
        setUsage(await res.json());
      }
    } catch {
      // Continue
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

  const isPremium = usage?.isPremium || false;

  return (
    <div className="py-4 space-y-6">
      <h1 className="text-xl font-bold text-whiskey-text">プラン</h1>

      {/* Current Usage */}
      {usage && !isPremium && (
        <div className="bg-whiskey-card border border-whiskey-border rounded-lg p-4 space-y-2">
          <p className="text-sm text-whiskey-muted">今月のAI利用状況</p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-whiskey-gold">
              {usage.usedThisMonth}
            </span>
            <span className="text-whiskey-muted text-sm pb-1">/ 3 回</span>
          </div>
          <div className="h-2 bg-whiskey-bg rounded-full overflow-hidden">
            <div
              className="h-full bg-whiskey-gold rounded-full transition-all"
              style={{
                width: `${Math.min((usage.usedThisMonth / 3) * 100, 100)}%`,
              }}
            />
          </div>
          {usage.remaining === 0 && (
            <p className="text-xs text-red-400">
              今月の無料枠を使い切りました
            </p>
          )}
        </div>
      )}

      {isPremium && (
        <div className="bg-gradient-to-br from-whiskey-gold/20 to-whiskey-gold/5 border border-whiskey-gold/30 rounded-lg p-4 flex items-center gap-3">
          <Crown size={24} className="text-whiskey-gold" />
          <div>
            <p className="text-sm font-bold text-whiskey-gold">
              プレミアムプラン利用中
            </p>
            <p className="text-xs text-whiskey-muted">
              AI機能を無制限にお使いいただけます
            </p>
          </div>
        </div>
      )}

      {/* Plan Cards */}
      <div className="space-y-4">
        {/* Free Plan */}
        <div
          className={`border rounded-xl p-5 space-y-4 ${
            !isPremium
              ? "border-whiskey-gold bg-whiskey-card"
              : "border-whiskey-border bg-whiskey-card/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-whiskey-text">フリー</h2>
              <p className="text-2xl font-bold text-whiskey-text mt-1">
                ¥0
                <span className="text-sm text-whiskey-muted font-normal">
                  /月
                </span>
              </p>
            </div>
            {!isPremium && (
              <span className="text-xs bg-whiskey-gold/10 text-whiskey-gold px-2 py-1 rounded-full border border-whiskey-gold/20">
                現在のプラン
              </span>
            )}
          </div>

          <ul className="space-y-2.5">
            <FeatureRow included label="ウイスキーの記録（無制限）" />
            <FeatureRow included label="コレクション管理" />
            <FeatureRow included label="レベルシステム・XP" />
            <FeatureRow included label="SNSシェア" />
            <FeatureRow
              included
              label="AI機能 月3回まで"
              sub="撮影解析・調査・おすすめ・分析"
            />
            <FeatureRow included={false} label="AI機能 無制限" />
          </ul>
        </div>

        {/* Premium Plan */}
        <div
          className={`border rounded-xl p-5 space-y-4 relative overflow-hidden ${
            isPremium
              ? "border-whiskey-gold bg-gradient-to-br from-whiskey-card to-whiskey-gold/5"
              : "border-whiskey-gold/50 bg-whiskey-card"
          }`}
        >
          {/* Recommended badge */}
          {!isPremium && (
            <div className="absolute top-0 right-0 bg-whiskey-gold text-whiskey-bg text-[10px] font-bold px-3 py-1 rounded-bl-lg">
              おすすめ
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Crown size={18} className="text-whiskey-gold" />
                <h2 className="text-lg font-bold text-whiskey-gold">
                  プレミアム
                </h2>
              </div>
              <p className="text-2xl font-bold text-whiskey-gold mt-1">
                ¥500
                <span className="text-sm text-whiskey-muted font-normal">
                  /月
                </span>
              </p>
            </div>
            {isPremium && (
              <span className="text-xs bg-whiskey-gold/10 text-whiskey-gold px-2 py-1 rounded-full border border-whiskey-gold/20">
                現在のプラン
              </span>
            )}
          </div>

          <ul className="space-y-2.5">
            <FeatureRow included label="フリープランの全機能" />
            <FeatureRow
              included
              highlight
              label="AI機能 無制限"
              sub="何度でも使い放題"
            />
            <FeatureRow
              included
              highlight
              label="AIボトル撮影解析"
              sub="撮るだけで自動入力"
            />
            <FeatureRow
              included
              highlight
              label="AI蒸留所調査レポート"
              sub="歴史・製法・つまみ提案"
            />
            <FeatureRow
              included
              highlight
              label="AIおすすめウイスキー"
              sub="好みを学習して提案"
            />
            <FeatureRow
              included
              highlight
              label="AI好み分析ダッシュボード"
              sub="あなたのウイスキータイプ診断"
            />
          </ul>

          {!isPremium && (
            <button
              onClick={() => {
                // TODO: Stripe Checkout integration
                alert(
                  "決済機能は準備中です。\nStripe連携後にご利用いただけます。"
                );
              }}
              className="w-full bg-whiskey-gold hover:bg-whiskey-gold-dark text-whiskey-bg font-bold py-3.5 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Crown size={16} />
              プレミアムにアップグレード
            </button>
          )}
        </div>
      </div>

      {/* Value proposition */}
      <div className="bg-whiskey-card border border-whiskey-border rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-bold text-whiskey-gold">
          月500円でできること
        </h3>
        <div className="space-y-3">
          <ValueRow
            icon={<Camera size={16} />}
            title="撮るだけ自動記録"
            description="ボトルを撮影するだけでAIがウイスキー情報を自動入力。手間ゼロでネタ帳が完成"
          />
          <ValueRow
            icon={<Search size={16} />}
            title="蒸留所のプロ知識"
            description="歴史・製法・合うつまみまで。バーで語れるウンチクが身につく"
          />
          <ValueRow
            icon={<Sparkles size={16} />}
            title="次の一本をAIが提案"
            description="あなたの好みを学習して、まだ出会っていないウイスキーを見つけてくれる"
          />
          <ValueRow
            icon={<Star size={16} />}
            title="好み分析ダッシュボード"
            description="自分の味覚の傾向が見える。講習に行くより手軽にウイスキーを学べる"
          />
        </div>
        <p className="text-xs text-whiskey-muted text-center pt-2">
          ウイスキーセミナー1回分 (¥3,000〜) より圧倒的にお得
        </p>
      </div>

      {/* Back link */}
      <Link
        href="/profile"
        className="block text-center text-sm text-whiskey-muted hover:text-whiskey-gold transition-colors"
      >
        マイページに戻る
      </Link>
    </div>
  );
}

function FeatureRow({
  included,
  label,
  sub,
  highlight,
}: {
  included: boolean;
  label: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <li className="flex items-start gap-2">
      {included ? (
        <Check
          size={16}
          className={`mt-0.5 flex-shrink-0 ${highlight ? "text-whiskey-gold" : "text-green-400"}`}
        />
      ) : (
        <X size={16} className="text-whiskey-muted/40 mt-0.5 flex-shrink-0" />
      )}
      <div>
        <span
          className={`text-sm ${included ? "text-whiskey-text" : "text-whiskey-muted/40"}`}
        >
          {label}
        </span>
        {sub && (
          <p className="text-[11px] text-whiskey-muted">{sub}</p>
        )}
      </div>
    </li>
  );
}

function ValueRow({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="text-whiskey-gold mt-0.5 flex-shrink-0">{icon}</div>
      <div>
        <p className="text-sm font-medium text-whiskey-text">{title}</p>
        <p className="text-xs text-whiskey-muted">{description}</p>
      </div>
    </div>
  );
}
