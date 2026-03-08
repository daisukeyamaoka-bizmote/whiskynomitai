"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Edit3,
  Trash2,
  Loader2,
  Save,
  X,
  MapPin,
  Calendar,
  Banknote,
  Search,
  Sparkles,
  ChevronDown,
  ChevronUp,
  UtensilsCrossed,
  Landmark,
  FlaskConical,
  Wine,
  Share2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import ShareModal from "@/components/ShareModal";

interface FoodPairing {
  name: string;
  reason: string;
}

interface ResearchData {
  distillery_history: string;
  distillery_features: string;
  production_method: string;
  tasting_profile: string;
  food_pairings: FoodPairing[];
}

interface TastingRecord {
  id: string;
  name: string;
  distillery: string | null;
  region: string | null;
  type: string | null;
  abv: number | null;
  age: number | null;
  flavor_tags: string[];
  description: string | null;
  rating: number;
  note: string | null;
  photo_url: string | null;
  drinking_location: string | null;
  price: number | null;
  created_at: string;
  research_data: ResearchData | null;
}

export default function RecordDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [record, setRecord] = useState<TastingRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<TastingRecord>>({});
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState("");
  const [researching, setResearching] = useState(false);
  const [researchOpen, setResearchOpen] = useState(true);
  const [showShare, setShowShare] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchRecord();
  }, [id]);

  const fetchRecord = async () => {
    try {
      const response = await fetch(`/api/records/${id}`);
      if (response.ok) {
        const data = await response.json();
        setRecord(data);
      } else {
        setError("記録が見つかりません");
      }
    } catch {
      setError("記録の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    if (!record) return;
    setEditData({
      rating: record.rating,
      note: record.note,
      drinking_location: record.drinking_location,
      price: record.price,
    });
    setEditing(true);
  };

  const handleSave = async () => {
    if (!record) return;
    setSaving(true);

    try {
      const response = await fetch(`/api/records/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...record, ...editData }),
      });

      if (response.ok) {
        const updated = await response.json();
        setRecord(updated);
        setEditing(false);
      } else {
        setError("更新に失敗しました");
      }
    } catch {
      setError("更新中にエラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/records/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.push("/collection");
      } else {
        setError("削除に失敗しました");
      }
    } catch {
      setError("削除中にエラーが発生しました");
    }
  };

  const handleResearch = async () => {
    if (!record || researching) return;
    setResearching(true);
    setError("");

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          record_id: record.id,
          name: record.name,
          distillery: record.distillery,
          region: record.region,
          type: record.type,
          age: record.age,
          abv: record.abv,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setRecord({ ...record, research_data: data });
      } else {
        const err = await response.json();
        setError(err.error || "調査に失敗しました");
      }
    } catch {
      setError("調査中にエラーが発生しました");
    } finally {
      setResearching(false);
    }
  };

  if (loading) {
    return (
      <div className="py-8 flex justify-center">
        <Loader2 size={32} className="animate-spin text-whiskey-gold" />
      </div>
    );
  }

  if (error && !record) {
    return (
      <div className="py-8 text-center">
        <p className="text-red-400">{error}</p>
        <Link
          href="/collection"
          className="text-whiskey-gold hover:text-whiskey-gold-dark mt-4 inline-block"
        >
          コレクションに戻る
        </Link>
      </div>
    );
  }

  if (!record) return null;

  return (
    <div className="py-4 space-y-4">
      {/* Back button */}
      <Link
        href="/collection"
        className="inline-flex items-center gap-1 text-whiskey-muted hover:text-whiskey-gold transition-colors text-sm"
      >
        <ArrowLeft size={16} />
        コレクション
      </Link>

      {/* Header Image */}
      {record.photo_url && (
        <div className="aspect-[4/3] rounded-lg overflow-hidden">
          <Image
            src={record.photo_url}
            alt={record.name}
            width={480}
            height={360}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Whiskey Info */}
      <div className="bg-whiskey-card border border-whiskey-border rounded-lg p-4 space-y-3">
        <h1 className="text-xl font-bold text-whiskey-gold">{record.name}</h1>

        <div className="space-y-2 text-sm">
          {record.distillery && (
            <div className="flex justify-between">
              <span className="text-whiskey-muted">蒸留所</span>
              <span>{record.distillery}</span>
            </div>
          )}
          {record.region && (
            <div className="flex justify-between">
              <span className="text-whiskey-muted">産地</span>
              <span>{record.region}</span>
            </div>
          )}
          {record.type && (
            <div className="flex justify-between">
              <span className="text-whiskey-muted">タイプ</span>
              <span>{record.type}</span>
            </div>
          )}
          {record.abv && (
            <div className="flex justify-between">
              <span className="text-whiskey-muted">度数</span>
              <span>{record.abv}%</span>
            </div>
          )}
          {record.age && (
            <div className="flex justify-between">
              <span className="text-whiskey-muted">熟成年数</span>
              <span>{record.age}年</span>
            </div>
          )}
        </div>

        {/* Flavor Tags */}
        {record.flavor_tags.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {record.flavor_tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-whiskey-gold/10 text-whiskey-gold text-xs rounded-full border border-whiskey-gold/20"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Description */}
        {record.description && (
          <p className="text-whiskey-muted text-sm leading-relaxed">
            {record.description}
          </p>
        )}
      </div>

      {/* AI Research Section */}
      {record.research_data ? (
        <div className="bg-whiskey-card border border-whiskey-border rounded-lg overflow-hidden">
          <button
            onClick={() => setResearchOpen(!researchOpen)}
            className="w-full flex items-center justify-between p-4 text-left"
          >
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-whiskey-gold" />
              <span className="text-sm font-bold text-whiskey-gold">
                AI調査レポート
              </span>
            </div>
            {researchOpen ? (
              <ChevronUp size={16} className="text-whiskey-muted" />
            ) : (
              <ChevronDown size={16} className="text-whiskey-muted" />
            )}
          </button>

          {researchOpen && (
            <div className="px-4 pb-4 space-y-4">
              {/* Distillery History */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Landmark size={14} className="text-whiskey-gold/70" />
                  <h3 className="text-xs font-bold text-whiskey-gold/70 uppercase tracking-wider">
                    蒸留所の歴史
                  </h3>
                </div>
                <p className="text-whiskey-text text-sm leading-relaxed">
                  {record.research_data.distillery_history}
                </p>
              </div>

              {/* Distillery Features */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={14} className="text-whiskey-gold/70" />
                  <h3 className="text-xs font-bold text-whiskey-gold/70 uppercase tracking-wider">
                    蒸留所の特徴
                  </h3>
                </div>
                <p className="text-whiskey-text text-sm leading-relaxed">
                  {record.research_data.distillery_features}
                </p>
              </div>

              {/* Production Method */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <FlaskConical size={14} className="text-whiskey-gold/70" />
                  <h3 className="text-xs font-bold text-whiskey-gold/70 uppercase tracking-wider">
                    製造方法
                  </h3>
                </div>
                <p className="text-whiskey-text text-sm leading-relaxed">
                  {record.research_data.production_method}
                </p>
              </div>

              {/* Tasting Profile */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Wine size={14} className="text-whiskey-gold/70" />
                  <h3 className="text-xs font-bold text-whiskey-gold/70 uppercase tracking-wider">
                    味わいのプロフィール
                  </h3>
                </div>
                <p className="text-whiskey-text text-sm leading-relaxed">
                  {record.research_data.tasting_profile}
                </p>
              </div>

              {/* Food Pairings */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <UtensilsCrossed size={14} className="text-whiskey-gold/70" />
                  <h3 className="text-xs font-bold text-whiskey-gold/70 uppercase tracking-wider">
                    おすすめのつまみ
                  </h3>
                </div>
                <div className="space-y-2">
                  {record.research_data.food_pairings.map((pairing, i) => (
                    <div
                      key={i}
                      className="bg-whiskey-bg/50 rounded-lg px-3 py-2"
                    >
                      <span className="text-whiskey-text text-sm font-medium">
                        {pairing.name}
                      </span>
                      <p className="text-whiskey-muted text-xs mt-0.5">
                        {pairing.reason}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Re-research button */}
              <button
                onClick={handleResearch}
                disabled={researching}
                className="w-full text-xs text-whiskey-muted hover:text-whiskey-gold transition-colors py-1 flex items-center justify-center gap-1"
              >
                {researching ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Search size={12} />
                )}
                再調査する
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={handleResearch}
          disabled={researching}
          className="w-full bg-gradient-to-r from-whiskey-gold/20 to-whiskey-gold/10 border border-whiskey-gold/30 rounded-lg p-4 flex items-center justify-center gap-2 hover:from-whiskey-gold/30 hover:to-whiskey-gold/20 transition-all disabled:opacity-50"
        >
          {researching ? (
            <>
              <Loader2 size={18} className="animate-spin text-whiskey-gold" />
              <span className="text-whiskey-gold text-sm font-medium">
                AIが調査中...
              </span>
            </>
          ) : (
            <>
              <Sparkles size={18} className="text-whiskey-gold" />
              <span className="text-whiskey-gold text-sm font-medium">
                AIで詳しく調べる
              </span>
              <span className="text-whiskey-muted text-xs ml-1">
                蒸留所の歴史・製法・合うつまみ
              </span>
            </>
          )}
        </button>
      )}

      {/* Rating */}
      <div className="bg-whiskey-card border border-whiskey-border rounded-lg p-4">
        <div className="text-center">
          <span className="text-whiskey-muted text-sm">評価</span>
          <div className="flex items-center gap-1 justify-center mt-2">
            {editing
              ? Array.from({ length: 10 }, (_, i) => (
                  <button
                    key={i}
                    onClick={() =>
                      setEditData({ ...editData, rating: i + 1 })
                    }
                    className={`w-7 h-7 rounded-full border-2 transition-all ${
                      i < (editData.rating || record.rating)
                        ? "bg-whiskey-gold border-whiskey-gold"
                        : "border-whiskey-border hover:border-whiskey-gold/50"
                    }`}
                  />
                ))
              : Array.from({ length: 10 }, (_, i) => (
                  <div
                    key={i}
                    className={`w-7 h-7 rounded-full border-2 ${
                      i < record.rating
                        ? "bg-whiskey-gold border-whiskey-gold"
                        : "border-whiskey-border"
                    }`}
                  />
                ))}
          </div>
          <p className="text-whiskey-gold text-2xl font-bold mt-1">
            {editing ? editData.rating || record.rating : record.rating}/10
          </p>
        </div>
      </div>

      {/* Tasting Note */}
      <div className="bg-whiskey-card border border-whiskey-border rounded-lg p-4 space-y-2">
        <h2 className="text-sm font-bold text-whiskey-gold">
          テイスティングノート
        </h2>
        {editing ? (
          <textarea
            value={editData.note || ""}
            onChange={(e) =>
              setEditData({ ...editData, note: e.target.value })
            }
            className="w-full bg-whiskey-bg border border-whiskey-border rounded-lg px-3 py-2 text-whiskey-text text-sm placeholder:text-whiskey-muted/50 focus:outline-none focus:border-whiskey-gold transition-colors min-h-[80px] resize-none"
          />
        ) : record.note ? (
          <p className="text-whiskey-text text-sm leading-relaxed">
            {record.note}
          </p>
        ) : (
          <p className="text-whiskey-muted text-sm">ノートなし</p>
        )}
      </div>

      {/* Meta Info */}
      <div className="bg-whiskey-card border border-whiskey-border rounded-lg p-4 space-y-2">
        {editing ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-whiskey-muted mb-1">
                飲んだ場所
              </label>
              <input
                type="text"
                value={editData.drinking_location || ""}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    drinking_location: e.target.value,
                  })
                }
                className="w-full bg-whiskey-bg border border-whiskey-border rounded-lg px-3 py-2 text-whiskey-text text-sm focus:outline-none focus:border-whiskey-gold transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-whiskey-muted mb-1">
                価格（円）
              </label>
              <input
                type="number"
                value={editData.price || ""}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    price: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
                className="w-full bg-whiskey-bg border border-whiskey-border rounded-lg px-3 py-2 text-whiskey-text text-sm focus:outline-none focus:border-whiskey-gold transition-colors"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            {record.drinking_location && (
              <div className="flex items-center gap-2 text-whiskey-muted">
                <MapPin size={14} />
                <span>{record.drinking_location}</span>
              </div>
            )}
            {record.price && (
              <div className="flex items-center gap-2 text-whiskey-muted">
                <Banknote size={14} />
                <span>¥{record.price.toLocaleString()}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-whiskey-muted">
              <Calendar size={14} />
              <span>
                {new Date(record.created_at).toLocaleDateString("ja-JP", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        {editing ? (
          <>
            <button
              onClick={() => setEditing(false)}
              className="flex-1 border border-whiskey-border text-whiskey-text py-3 rounded-lg hover:bg-whiskey-card transition-colors flex items-center justify-center gap-2"
            >
              <X size={16} />
              キャンセル
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-whiskey-gold hover:bg-whiskey-gold-dark text-whiskey-bg font-bold py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              保存
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleEdit}
              className="flex-1 border border-whiskey-border text-whiskey-text py-3 rounded-lg hover:bg-whiskey-card transition-colors flex items-center justify-center gap-2"
            >
              <Edit3 size={16} />
              編集
            </button>
            <button
              onClick={() => setShowShare(true)}
              className="flex-1 border border-whiskey-gold/30 text-whiskey-gold py-3 rounded-lg hover:bg-whiskey-gold/10 transition-colors flex items-center justify-center gap-2"
            >
              <Share2 size={16} />
              シェア
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 border border-red-900/50 text-red-400 py-3 rounded-lg hover:bg-red-950/30 transition-colors flex items-center justify-center"
            >
              <Trash2 size={16} />
            </button>
          </>
        )}
      </div>

      {error && <p className="text-red-400 text-sm text-center">{error}</p>}

      {/* Share Modal */}
      {showShare && (
        <ShareModal
          recordId={record.id}
          name={record.name}
          rating={record.rating}
          distillery={record.distillery}
          region={record.region}
          type={record.type}
          flavorTags={record.flavor_tags}
          note={record.note}
          onClose={() => setShowShare(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-whiskey-card border border-whiskey-border rounded-lg p-6 max-w-sm w-full space-y-4">
            <h3 className="text-lg font-bold text-whiskey-text">
              記録を削除しますか？
            </h3>
            <p className="text-whiskey-muted text-sm">
              「{record.name}」の記録を削除します。この操作は取り消せません。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 border border-whiskey-border text-whiskey-text py-2.5 rounded-lg hover:bg-whiskey-bg transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-lg transition-colors"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
