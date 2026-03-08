"use client";

import { useRef, useCallback, useState } from "react";
import { X, Download, Share2, Check } from "lucide-react";

interface ShareCardProps {
  recordId: string;
  name: string;
  rating: number;
  distillery: string | null;
  region: string | null;
  type: string | null;
  flavorTags: string[];
  note: string | null;
  onClose: () => void;
}

export default function ShareModal({
  recordId,
  name,
  rating,
  distillery,
  region,
  type,
  flavorTags,
  note,
  onClose,
}: ShareCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shared, setShared] = useState(false);

  const shareText = [
    `${name} ${rating}/10`,
    [distillery, region, type].filter(Boolean).join(" / "),
    flavorTags.length > 0 ? flavorTags.map((t) => `#${t}`).join(" ") : "",
    note ? `\n${note.length > 60 ? note.slice(0, 60) + "..." : note}` : "",
    "\n#ウイスキー #WhiskeyNomitai",
  ]
    .filter(Boolean)
    .join("\n");

  const logShare = async (platform: string) => {
    try {
      await fetch("/api/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ record_id: recordId, platform }),
      });
      setShared(true);
    } catch {
      // Silent fail - don't block sharing
    }
  };

  const drawCard = useCallback((): HTMLCanvasElement | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const w = 600;
    const h = 400;
    canvas.width = w;
    canvas.height = h;

    // Background
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, w, h);

    // Border accent
    ctx.strokeStyle = "#d4af37";
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 16, w - 32, h - 32);

    // Corner accents
    ctx.strokeStyle = "#d4af37";
    ctx.lineWidth = 3;
    // Top-left
    ctx.beginPath();
    ctx.moveTo(16, 36);
    ctx.lineTo(16, 16);
    ctx.lineTo(36, 16);
    ctx.stroke();
    // Top-right
    ctx.beginPath();
    ctx.moveTo(w - 36, 16);
    ctx.lineTo(w - 16, 16);
    ctx.lineTo(w - 16, 36);
    ctx.stroke();
    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(16, h - 36);
    ctx.lineTo(16, h - 16);
    ctx.lineTo(36, h - 16);
    ctx.stroke();
    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(w - 36, h - 16);
    ctx.lineTo(w - 16, h - 16);
    ctx.lineTo(w - 16, h - 36);
    ctx.stroke();

    // App name
    ctx.fillStyle = "#d4af37";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("WHISKEY NOMITAI", w / 2, 50);

    // Divider
    ctx.strokeStyle = "#d4af3740";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(200, 60);
    ctx.lineTo(400, 60);
    ctx.stroke();

    // Whiskey name
    ctx.fillStyle = "#d4af37";
    ctx.font = "bold 26px sans-serif";
    ctx.textAlign = "center";
    let displayName = name;
    while (ctx.measureText(displayName).width > w - 80 && displayName.length > 0) {
      displayName = displayName.slice(0, -1);
    }
    if (displayName !== name) displayName += "...";
    ctx.fillText(displayName, w / 2, 100);

    // Sub info
    const subInfo = [distillery, region, type].filter(Boolean).join(" / ");
    if (subInfo) {
      ctx.fillStyle = "#888";
      ctx.font = "14px sans-serif";
      ctx.fillText(subInfo, w / 2, 125);
    }

    // Rating dots
    const dotRadius = 10;
    const dotGap = 26;
    const dotsStartX = w / 2 - ((10 - 1) * dotGap) / 2;
    const dotsY = 165;

    for (let i = 0; i < 10; i++) {
      const cx = dotsStartX + i * dotGap;
      ctx.beginPath();
      ctx.arc(cx, dotsY, dotRadius, 0, Math.PI * 2);
      if (i < rating) {
        ctx.fillStyle = "#d4af37";
        ctx.fill();
      } else {
        ctx.strokeStyle = "#444";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Rating number
    ctx.fillStyle = "#d4af37";
    ctx.font = "bold 36px sans-serif";
    ctx.fillText(`${rating}/10`, w / 2, 220);

    // Flavor tags
    if (flavorTags.length > 0) {
      const tagsY = 260;
      ctx.font = "13px sans-serif";
      const displayTags = flavorTags.slice(0, 5);
      const tagTexts = displayTags.map((t) => `#${t}`);
      const fullTagText = tagTexts.join("  ");
      ctx.fillStyle = "#d4af3799";
      ctx.fillText(fullTagText, w / 2, tagsY);
    }

    // Note (truncated)
    if (note) {
      const noteY = 300;
      ctx.fillStyle = "#aaa";
      ctx.font = "13px sans-serif";
      let displayNote = note;
      if (displayNote.length > 50) {
        displayNote = displayNote.slice(0, 50) + "...";
      }
      ctx.fillText(`"${displayNote}"`, w / 2, noteY);
    }

    // Date
    ctx.fillStyle = "#555";
    ctx.font = "11px sans-serif";
    ctx.fillText(
      new Date().toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      w / 2,
      h - 35
    );

    return canvas;
  }, [name, rating, distillery, region, type, flavorTags, note]);

  const handleDownload = async () => {
    const canvas = drawCard();
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = `whiskey-${name.replace(/\s+/g, "-")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();

    await logShare("download");
  };

  const handleNativeShare = async () => {
    const canvas = drawCard();

    if (navigator.share) {
      try {
        const shareData: ShareData = { text: shareText };

        if (canvas) {
          const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, "image/png")
          );
          if (blob) {
            const file = new File([blob], `whiskey-${name}.png`, {
              type: "image/png",
            });
            if (navigator.canShare?.({ files: [file] })) {
              shareData.files = [file];
            }
          }
        }

        await navigator.share(shareData);
        await logShare("native");
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }

    // Fallback: copy text
    await navigator.clipboard.writeText(shareText);
    await logShare("native");
    alert("シェアテキストをコピーしました");
  };

  const handleXShare = async () => {
    const text = encodeURIComponent(shareText);
    window.open(
      `https://x.com/intent/tweet?text=${text}`,
      "_blank",
      "noopener,noreferrer"
    );
    await logShare("x");
  };

  const handleLineShare = async () => {
    const text = encodeURIComponent(shareText);
    window.open(
      `https://social-plugins.line.me/lineit/share?text=${text}`,
      "_blank",
      "noopener,noreferrer"
    );
    await logShare("line");
  };

  // Draw card on mount
  const cardRef = useCallback(
    (node: HTMLCanvasElement | null) => {
      if (node) {
        (canvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = node;
        drawCard();
      }
    },
    [drawCard]
  );

  return (
    <div className="fixed inset-0 glass-overlay flex items-center justify-center z-50 px-4">
      <div className="bg-white border border-whiskey-border rounded-2xl w-full max-w-sm overflow-hidden shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-whiskey-border">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-whiskey-gold">シェアする</h3>
            {shared && (
              <span className="flex items-center gap-1 text-[10px] text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded-full">
                <Check size={10} />
                +15 XP
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-whiskey-muted hover:text-whiskey-text transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Share Card Preview */}
        <div className="p-4">
          <canvas
            ref={cardRef}
            className="w-full rounded-lg"
            style={{ aspectRatio: "3/2" }}
          />
        </div>

        {/* Share Buttons */}
        <div className="px-4 pb-4 space-y-2">
          {/* Native Share (mobile) */}
          <button
            onClick={handleNativeShare}
            className="w-full bg-whiskey-gold hover:bg-whiskey-gold-dark text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Share2 size={16} />
            シェアする
          </button>

          <div className="flex gap-2">
            {/* X (Twitter) */}
            <button
              onClick={handleXShare}
              className="flex-1 bg-black border border-whiskey-border text-white py-2.5 rounded-lg hover:bg-zinc-900 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Xでシェア
            </button>

            {/* LINE */}
            <button
              onClick={handleLineShare}
              className="flex-1 bg-[#06C755] text-white py-2.5 rounded-lg hover:bg-[#05b34c] transition-colors flex items-center justify-center gap-2 text-sm font-bold"
            >
              LINE
            </button>
          </div>

          {/* Download */}
          <button
            onClick={handleDownload}
            className="w-full border border-whiskey-border text-whiskey-muted py-2.5 rounded-lg hover:bg-whiskey-bg hover:text-whiskey-text transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Download size={14} />
            画像を保存
          </button>

          {!shared && (
            <p className="text-center text-[10px] text-whiskey-muted">
              シェアすると +15 XP 獲得!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
