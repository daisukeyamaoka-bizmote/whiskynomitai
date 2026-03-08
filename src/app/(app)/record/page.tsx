"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  Loader2,
  Edit3,
  Save,
  X,
  Send,
  SkipForward,
  ImagePlus,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import { resizeImage } from "@/lib/image";
import Image from "next/image";

interface WhiskeyInfo {
  name: string;
  name_ja: string | null;
  distillery: string | null;
  region: string | null;
  country: string | null;
  type: string | null;
  abv: number | null;
  age: number | null;
  flavor_tags: string[];
  description: string | null;
}

type Step = "capture" | "analyzing" | "review" | "saving" | "share";

export default function RecordPage() {
  const [step, setStep] = useState<Step>("capture");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [whiskeyInfo, setWhiskeyInfo] = useState<WhiskeyInfo | null>(null);
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(5);
  const [note, setNote] = useState("");
  const [drinkingLocation, setDrinkingLocation] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState("");
  const [savedRecordId, setSavedRecordId] = useState<string | null>(null);
  const [shareComment, setShareComment] = useState("");
  const [sharing, setSharing] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const albumInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("ファイルサイズは5MB以下にしてください");
      return;
    }

    setError("");
    setStep("analyzing");

    try {
      const { base64, blob } = await resizeImage(file);
      setImageBase64(base64);
      setImageBlob(blob);
      setImagePreview(URL.createObjectURL(blob));

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64,
          media_type: "image/jpeg",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "解析に失敗しました");
        setStep("capture");
        return;
      }

      setWhiskeyInfo(data);
      setStep("review");
    } catch {
      setError("画像の解析中にエラーが発生しました");
      setStep("capture");
    }
  };

  const handleSave = async () => {
    if (!whiskeyInfo) return;

    setStep("saving");
    setError("");

    try {
      // Upload image
      let photoUrl = "";
      if (imageBlob) {
        const formData = new FormData();
        formData.append(
          "file",
          new File([imageBlob], `whiskey_${Date.now()}.jpg`, {
            type: "image/jpeg",
          })
        );

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const uploadData = await uploadRes.json().catch(() => ({}));
          setError(uploadData.error || "画像のアップロードに失敗しました");
          setStep("review");
          return;
        }

        const uploadData = await uploadRes.json();
        photoUrl = uploadData.url;
      }

      // Save record
      const response = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photo_url: photoUrl,
          name: whiskeyInfo.name,
          distillery: whiskeyInfo.distillery,
          region: whiskeyInfo.region,
          type: whiskeyInfo.type,
          abv: whiskeyInfo.abv,
          age: whiskeyInfo.age,
          flavor_tags: whiskeyInfo.flavor_tags,
          description: whiskeyInfo.description,
          rating,
          note,
          drinking_location: drinkingLocation || null,
          price: price ? parseInt(price) : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "保存に失敗しました");
        setStep("review");
        return;
      }

      const savedData = await response.json();
      setSavedRecordId(savedData.id);
      setStep("share");
    } catch {
      setError("保存中にエラーが発生しました");
      setStep("review");
    }
  };

  const handleRetry = () => {
    setStep("capture");
    setImagePreview(null);
    setImageBase64(null);
    setImageBlob(null);
    setWhiskeyInfo(null);
    setError("");
    setRating(5);
    setNote("");
    setDrinkingLocation("");
    setPrice("");
  };

  const handleShareToTimeline = async () => {
    if (!savedRecordId) {
      setError("記録IDが見つかりません。もう一度お試しください。");
      return;
    }
    setSharing(true);
    setError("");

    try {
      const res = await fetch("/api/timeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          record_id: savedRecordId,
          comment: shareComment || null,
          is_public: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("Timeline POST failed:", res.status, data);
        setError(data.error || `投稿に失敗しました (${res.status})`);
        setSharing(false);
        return;
      }

      router.push("/timeline");
    } catch (err) {
      console.error("Timeline POST error:", err);
      setError("投稿中にエラーが発生しました。通信状況をご確認ください。");
      setSharing(false);
    }
  };

  const updateInfo = (field: keyof WhiskeyInfo, value: string | number | string[] | null) => {
    if (!whiskeyInfo) return;
    setWhiskeyInfo({ ...whiskeyInfo, [field]: value });
  };

  return (
    <div className="py-4 space-y-6 animate-fadeIn">
      <h1 className="text-xl font-bold text-whiskey-text">テイスティング記録</h1>

      {/* Capture Step */}
      {step === "capture" && (
        <div className="flex flex-col items-center gap-6 py-8 animate-fadeInScale">
          <div className="w-32 h-32 rounded-full glass-card border-2 border-dashed border-whiskey-gold/10 flex items-center justify-center animate-pulse-glow">
            <Camera size={48} className="text-whiskey-muted" />
          </div>
          <p className="text-whiskey-muted text-center text-sm">
            ウイスキーボトルを撮影するか
            <br />
            アルバムから写真を選んでください
          </p>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="w-full glass-button text-white font-bold px-8 py-3.5 flex items-center justify-center gap-2"
            >
              <Camera size={20} />
              ボトルを撮影する
            </button>
            <button
              onClick={() => albumInputRef.current?.click()}
              className="w-full glass-card !border-whiskey-gold/30 text-whiskey-gold font-bold px-8 py-3.5 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            >
              <ImagePlus size={20} />
              アルバムから選ぶ
            </button>
          </div>
          {/* Camera input (with capture attribute for direct camera) */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
          {/* Album input (no capture attribute to open photo picker) */}
          <input
            ref={albumInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}
        </div>
      )}

      {/* Analyzing Step */}
      {step === "analyzing" && (
        <div className="flex flex-col items-center gap-6 py-8">
          {imagePreview && (
            <div className="w-48 h-48 rounded-lg overflow-hidden">
              <Image
                src={imagePreview}
                alt="撮影した画像"
                width={192}
                height={192}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="flex items-center gap-3 text-whiskey-gold">
            <Loader2 size={24} className="animate-spin" />
            <span>AI解析中...</span>
          </div>
        </div>
      )}

      {/* Review Step */}
      {(step === "review" || step === "saving") && whiskeyInfo && (
        <div className="space-y-6">
          {/* Image Preview */}
          {imagePreview && (
            <div className="aspect-[4/3] rounded-lg overflow-hidden">
              <Image
                src={imagePreview}
                alt={whiskeyInfo.name}
                width={480}
                height={360}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Whiskey Info Card */}
          <div className="glass-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-whiskey-gold">
                ウイスキー情報
              </h2>
              <button
                onClick={() => setEditing(!editing)}
                className="text-whiskey-muted hover:text-whiskey-gold transition-colors"
                aria-label={editing ? "編集を閉じる" : "編集"}
              >
                {editing ? <X size={18} /> : <Edit3 size={18} />}
              </button>
            </div>

            {editing ? (
              <div className="space-y-3">
                <Field
                  label="名前"
                  value={whiskeyInfo.name}
                  onChange={(v) => updateInfo("name", v)}
                />
                <Field
                  label="蒸留所"
                  value={whiskeyInfo.distillery || ""}
                  onChange={(v) => updateInfo("distillery", v)}
                />
                <Field
                  label="産地"
                  value={whiskeyInfo.region || ""}
                  onChange={(v) => updateInfo("region", v)}
                />
                <Field
                  label="タイプ"
                  value={whiskeyInfo.type || ""}
                  onChange={(v) => updateInfo("type", v)}
                />
                <Field
                  label="度数 (%)"
                  value={whiskeyInfo.abv?.toString() || ""}
                  onChange={(v) =>
                    updateInfo("abv", v ? parseFloat(v) : null)
                  }
                  type="number"
                />
                <Field
                  label="熟成年数"
                  value={whiskeyInfo.age?.toString() || ""}
                  onChange={(v) =>
                    updateInfo("age", v ? parseInt(v) : null)
                  }
                  type="number"
                />
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <InfoRow label="名前" value={whiskeyInfo.name} />
                <InfoRow label="蒸留所" value={whiskeyInfo.distillery} />
                <InfoRow label="産地" value={whiskeyInfo.region} />
                <InfoRow label="タイプ" value={whiskeyInfo.type} />
                <InfoRow
                  label="度数"
                  value={whiskeyInfo.abv ? `${whiskeyInfo.abv}%` : null}
                />
                <InfoRow
                  label="熟成年数"
                  value={whiskeyInfo.age ? `${whiskeyInfo.age}年` : null}
                />
              </div>
            )}

            {/* Flavor Tags */}
            {whiskeyInfo.flavor_tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {whiskeyInfo.flavor_tags.map((tag) => (
                  <span
                    key={tag}
                    className="glass-tag px-2 py-1 text-whiskey-gold text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Description */}
            {whiskeyInfo.description && (
              <p className="text-whiskey-muted text-sm leading-relaxed pt-2">
                {whiskeyInfo.description}
              </p>
            )}
          </div>

          {/* Rating */}
          <div className="glass-card p-4 space-y-3">
            <h2 className="text-lg font-bold text-whiskey-gold">評価</h2>
            <div className="flex items-center gap-1 justify-center">
              {Array.from({ length: 10 }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setRating(i + 1)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    i < rating
                      ? "bg-whiskey-gold border-whiskey-gold"
                      : "border-whiskey-border hover:border-whiskey-gold/50"
                  }`}
                  aria-label={`${i + 1}点`}
                />
              ))}
            </div>
            <p className="text-center text-whiskey-gold text-2xl font-bold">
              {rating}/10
            </p>
          </div>

          {/* Tasting Note */}
          <div className="glass-card p-4 space-y-3">
            <h2 className="text-lg font-bold text-whiskey-gold">
              テイスティングノート
            </h2>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="香り、味わい、余韻などの印象を自由に記録..."
              className="w-full glass-input px-3 py-2 text-whiskey-text placeholder:text-whiskey-muted/50 min-h-[100px] resize-none text-sm"
            />
          </div>

          {/* Optional Fields */}
          <div className="glass-card p-4 space-y-3">
            <h2 className="text-lg font-bold text-whiskey-gold">その他</h2>
            <div>
              <label className="block text-xs text-whiskey-muted mb-1">飲んだ場所</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={drinkingLocation}
                  onChange={(e) => setDrinkingLocation(e.target.value)}
                  placeholder="バー名、住所など"
                  className="flex-1 glass-input px-3 py-2 text-whiskey-text text-sm placeholder:text-whiskey-muted/50"
                />
                {drinkingLocation.trim() && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(drinkingLocation.trim())}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-2 glass-tag text-whiskey-gold text-xs font-bold whitespace-nowrap active:scale-95 transition-transform"
                  >
                    <MapPin size={14} />
                    地図
                  </a>
                )}
              </div>
            </div>
            <Field
              label="価格（円）"
              value={price}
              onChange={setPrice}
              type="number"
              placeholder="1杯あたりの金額"
            />
          </div>

          {/* Save Button */}
          <div className="flex gap-3">
            <button
              onClick={handleRetry}
              className="flex-1 glass-card text-whiskey-text py-3 text-center active:scale-[0.98] transition-transform"
            >
              やり直す
            </button>
            <button
              onClick={handleSave}
              disabled={step === "saving"}
              className="flex-1 glass-button text-white font-bold py-3 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {step === "saving" ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save size={18} />
                  コレクションに保存
                </>
              )}
            </button>
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}
        </div>
      )}

      {/* Share Step */}
      {step === "share" && whiskeyInfo && (
        <div className="space-y-6 animate-fadeIn">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mx-auto">
              <Save size={28} className="text-green-400" />
            </div>
            <h2 className="text-lg font-bold text-whiskey-text">
              保存しました！
            </h2>
            <p className="text-whiskey-muted text-sm">
              ウイ活としてタイムラインに投稿しませんか？
            </p>
          </div>

          {/* Preview Card */}
          <div className="glass-card overflow-hidden">
            {imagePreview && (
              <div className="aspect-[4/3]">
                <Image
                  src={imagePreview}
                  alt={whiskeyInfo.name}
                  width={480}
                  height={360}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="p-3">
              <h3 className="font-bold text-whiskey-text text-sm">
                {whiskeyInfo.name}
              </h3>
              <p className="text-xs text-whiskey-muted">
                {[whiskeyInfo.distillery, whiskeyInfo.region, whiskeyInfo.type]
                  .filter(Boolean)
                  .join(" / ")}
              </p>
              <p className="text-whiskey-gold font-bold text-sm mt-1">
                {rating}/10
              </p>
            </div>
          </div>

          {/* Share Comment */}
          <div>
            <label className="block text-xs text-whiskey-muted mb-1">
              ひとことコメント（任意）
            </label>
            <textarea
              value={shareComment}
              onChange={(e) => setShareComment(e.target.value)}
              placeholder="今日のウイスキーの感想..."
              className="w-full glass-input px-3 py-2 text-whiskey-text placeholder:text-whiskey-muted/50 min-h-[80px] resize-none text-sm"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          {/* Share Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleShareToTimeline}
              disabled={sharing}
              className="w-full glass-button text-white font-bold py-3.5 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {sharing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  投稿中...
                </>
              ) : (
                <>
                  <Send size={18} />
                  ウイ活に投稿する
                </>
              )}
            </button>
            <button
              onClick={() => router.push("/collection")}
              className="w-full glass-card text-whiskey-muted py-3 flex items-center justify-center gap-2 text-sm active:scale-[0.98] transition-transform"
            >
              <SkipForward size={16} />
              投稿せずにコレクションへ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-whiskey-muted mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full glass-input px-3 py-2 text-whiskey-text text-sm placeholder:text-whiskey-muted/50"
      />
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="flex justify-between">
      <span className="text-whiskey-muted">{label}</span>
      <span className="text-whiskey-text">{value}</span>
    </div>
  );
}
