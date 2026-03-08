"use client";

import { useRef, useCallback, useState } from "react";
import { X, Download, Share2, Check, Loader2 } from "lucide-react";

interface AiShareModalProps {
  personalityTitle: string;
  personalityDescription: string;
  strength: string;
  tendency: string;
  topFlavors: string[];
  displayName: string;
  onClose: () => void;
}

export default function AiShareModal({
  personalityTitle,
  personalityDescription,
  strength,
  tendency,
  topFlavors,
  displayName,
  onClose,
}: AiShareModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shared, setShared] = useState(false);
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);

  const shareText = [
    `🥃 AIマイスター分析結果`,
    ``,
    `タイプ: ${personalityTitle}`,
    personalityDescription,
    ``,
    `強み: ${strength}`,
    topFlavors.length > 0
      ? `好みフレーバー: ${topFlavors.map((f) => `#${f}`).join(" ")}`
      : "",
    ``,
    `#ウイスキー #WhiskeyNomitai #AIマイスター分析`,
  ]
    .filter((line) => line !== undefined)
    .join("\n");

  const wrapText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ): number => {
    const chars = text.split("");
    let line = "";
    let currentY = y;
    for (const char of chars) {
      const testLine = line + char;
      if (ctx.measureText(testLine).width > maxWidth && line.length > 0) {
        ctx.fillText(line, x, currentY);
        line = char;
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    if (line) {
      ctx.fillText(line, x, currentY);
      currentY += lineHeight;
    }
    return currentY;
  };

  const drawCard = useCallback((): HTMLCanvasElement | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const w = 600;
    const h = 800;
    canvas.width = w;
    canvas.height = h;

    // Background - warm cream
    ctx.fillStyle = "#F7F6F3";
    ctx.fillRect(0, 0, w, h);

    // Gold accent bar at top
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, "#C8963E");
    grad.addColorStop(1, "#D4AF37");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, 6);

    // App name
    ctx.fillStyle = "#C8963E";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("WHISKEY NOMITAI ─ AIマイスター分析", w / 2, 40);

    // Divider
    ctx.strokeStyle = "#E8E4DE";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(60, 55);
    ctx.lineTo(w - 60, 55);
    ctx.stroke();

    // User name
    ctx.fillStyle = "#9C958C";
    ctx.font = "13px sans-serif";
    ctx.fillText(`${displayName} さんの分析結果`, w / 2, 80);

    // Personality title
    ctx.fillStyle = "#C8963E";
    ctx.font = "bold 32px sans-serif";
    let titleDisplay = personalityTitle;
    while (
      ctx.measureText(titleDisplay).width > w - 80 &&
      titleDisplay.length > 0
    ) {
      titleDisplay = titleDisplay.slice(0, -1);
    }
    if (titleDisplay !== personalityTitle) titleDisplay += "...";
    ctx.fillText(titleDisplay, w / 2, 125);

    // Gold decorative line under title
    ctx.strokeStyle = "#C8963E";
    ctx.lineWidth = 2;
    ctx.beginPath();
    const titleW = Math.min(ctx.measureText(titleDisplay).width + 40, w - 120);
    ctx.moveTo((w - titleW) / 2, 140);
    ctx.lineTo((w + titleW) / 2, 140);
    ctx.stroke();

    // Personality description - wrapped
    ctx.fillStyle = "#1A1614";
    ctx.font = "14px sans-serif";
    ctx.textAlign = "left";
    let nextY = wrapText(ctx, personalityDescription, 50, 175, w - 100, 22);

    // Strength section
    nextY += 15;
    ctx.fillStyle = "#C8963E";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText("▎ あなたの強み", 50, nextY);
    nextY += 22;
    ctx.fillStyle = "#1A1614";
    ctx.font = "14px sans-serif";
    nextY = wrapText(ctx, strength, 50, nextY, w - 100, 22);

    // Tendency section
    nextY += 15;
    ctx.fillStyle = "#C8963E";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText("▎ 好みの傾向", 50, nextY);
    nextY += 22;
    ctx.fillStyle = "#1A1614";
    ctx.font = "14px sans-serif";
    nextY = wrapText(ctx, tendency, 50, nextY, w - 100, 22);

    // Flavor tags
    if (topFlavors.length > 0) {
      nextY += 20;
      ctx.fillStyle = "#C8963E";
      ctx.font = "bold 13px sans-serif";
      ctx.fillText("▎ 好みフレーバー", 50, nextY);
      nextY += 25;
      let tagX = 50;
      ctx.font = "13px sans-serif";
      for (const f of topFlavors.slice(0, 5)) {
        const tagText = `#${f}`;
        const tagW = ctx.measureText(tagText).width + 20;
        if (tagX + tagW > w - 50) {
          tagX = 50;
          nextY += 30;
        }
        // Tag bg
        ctx.fillStyle = "rgba(200, 150, 62, 0.1)";
        ctx.beginPath();
        ctx.roundRect(tagX, nextY - 16, tagW, 26, 13);
        ctx.fill();
        // Tag border
        ctx.strokeStyle = "rgba(200, 150, 62, 0.3)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(tagX, nextY - 16, tagW, 26, 13);
        ctx.stroke();
        // Tag text
        ctx.fillStyle = "#C8963E";
        ctx.fillText(tagText, tagX + 10, nextY + 2);
        tagX += tagW + 8;
      }
    }

    // Footer
    ctx.fillStyle = "#9C958C";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      new Date().toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      w / 2,
      h - 30
    );

    // Bottom gold bar
    ctx.fillStyle = grad;
    ctx.fillRect(0, h - 6, w, 6);

    return canvas;
  }, [
    personalityTitle,
    personalityDescription,
    strength,
    tendency,
    topFlavors,
    displayName,
  ]);

  const getCanvasBlob = async (): Promise<Blob | null> => {
    const canvas = drawCard();
    if (!canvas) return null;
    return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  };

  const handleDownload = async () => {
    const canvas = drawCard();
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `ai-maister-${personalityTitle}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    setShared(true);
  };

  const handleNativeShare = async () => {
    const blob = await getCanvasBlob();
    if (navigator.share) {
      try {
        const shareData: ShareData = { text: shareText };
        if (blob) {
          const file = new File([blob], "ai-maister.png", {
            type: "image/png",
          });
          if (navigator.canShare?.({ files: [file] })) {
            shareData.files = [file];
          }
        }
        await navigator.share(shareData);
        setShared(true);
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }
    await navigator.clipboard.writeText(shareText);
    setShared(true);
    alert("シェアテキストをコピーしました");
  };

  const handleXShare = () => {
    const text = encodeURIComponent(shareText);
    window.open(
      `https://x.com/intent/tweet?text=${text}`,
      "_blank",
      "noopener,noreferrer"
    );
    setShared(true);
  };

  const handleInstagramShare = async () => {
    // Instagram doesn't have a direct share URL with text.
    // Best approach: download the image so user can post it to Instagram Stories/Feed.
    const canvas = drawCard();
    if (!canvas) return;

    if (navigator.share) {
      const blob = await getCanvasBlob();
      if (blob) {
        const file = new File([blob], "ai-maister.png", {
          type: "image/png",
        });
        try {
          await navigator.share({ files: [file] });
          setShared(true);
          return;
        } catch {
          // fallback to download
        }
      }
    }

    // Fallback: download image
    const link = document.createElement("a");
    link.download = `ai-maister-${personalityTitle}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    setShared(true);
    alert("画像を保存しました。Instagramアプリから投稿してください。");
  };

  const handleTimelineShare = async () => {
    setPosting(true);
    try {
      const res = await fetch("/api/timeline/ai-share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personality_title: personalityTitle,
          personality_description: personalityDescription,
          strength,
          tendency,
          top_flavors: topFlavors,
        }),
      });
      if (res.ok) {
        setPosted(true);
        setShared(true);
      }
    } catch {
      // silent
    } finally {
      setPosting(false);
    }
  };

  const cardRef = useCallback(
    (node: HTMLCanvasElement | null) => {
      if (node) {
        (
          canvasRef as React.MutableRefObject<HTMLCanvasElement | null>
        ).current = node;
        drawCard();
      }
    },
    [drawCard]
  );

  return (
    <div className="fixed inset-0 glass-overlay flex items-center justify-center z-50 px-4">
      <div className="bg-white border border-whiskey-border rounded-2xl w-full max-w-sm overflow-hidden shadow-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-whiskey-border">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-whiskey-gold">
              分析結果をシェア
            </h3>
            {shared && (
              <span className="flex items-center gap-1 text-[10px] text-green-500 bg-green-50 px-1.5 py-0.5 rounded-full">
                <Check size={10} />
                シェア済み
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

        {/* Card Preview */}
        <div className="p-4">
          <canvas
            ref={cardRef}
            className="w-full rounded-lg border border-whiskey-border"
            style={{ aspectRatio: "3/4" }}
          />
        </div>

        {/* Share Buttons */}
        <div className="px-4 pb-4 space-y-2">
          {/* Timeline Share */}
          <button
            onClick={handleTimelineShare}
            disabled={posting || posted}
            className="w-full bg-whiskey-gold hover:bg-whiskey-gold-dark text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {posting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : posted ? (
              <Check size={16} />
            ) : (
              <Share2 size={16} />
            )}
            {posted ? "タイムラインに投稿しました" : "タイムラインにシェア"}
          </button>

          <div className="flex gap-2">
            {/* X (Twitter) */}
            <button
              onClick={handleXShare}
              className="flex-1 bg-black border border-whiskey-border text-white py-2.5 rounded-lg hover:bg-zinc-900 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Xでシェア
            </button>

            {/* Instagram */}
            <button
              onClick={handleInstagramShare}
              className="flex-1 text-white py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-bold"
              style={{
                background:
                  "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
              Instagram
            </button>
          </div>

          {/* Native Share (mobile) */}
          <button
            onClick={handleNativeShare}
            className="w-full border border-whiskey-border text-whiskey-muted py-2.5 rounded-lg hover:bg-whiskey-bg hover:text-whiskey-text transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Share2 size={14} />
            その他のアプリでシェア
          </button>

          {/* Download */}
          <button
            onClick={handleDownload}
            className="w-full border border-whiskey-border text-whiskey-muted py-2.5 rounded-lg hover:bg-whiskey-bg hover:text-whiskey-text transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Download size={14} />
            画像を保存
          </button>
        </div>
      </div>
    </div>
  );
}
