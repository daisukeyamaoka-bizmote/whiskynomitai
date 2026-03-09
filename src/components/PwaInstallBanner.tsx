"use client";

import { useState, useEffect } from "react";
import { Share2, X } from "lucide-react";

export default function PwaInstallBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // iOS Safari のみ表示（PWA未インストール時）
    const isIos =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
      || ("standalone" in navigator && (navigator as unknown as { standalone: boolean }).standalone);
    const dismissed = localStorage.getItem("pwa-banner-dismissed");

    if (isIos && !isStandalone && !dismissed) {
      // 少し遅延して表示（ページ読み込み後）
      const timer = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem("pwa-banner-dismissed", Date.now().toString());
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 glass-card p-4 animate-fadeIn border border-whiskey-gold/30 max-w-[480px] mx-auto">
      <button onClick={dismiss} className="absolute top-2 right-2 text-whiskey-muted hover:text-whiskey-text" aria-label="閉じる">
        <X size={18} />
      </button>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-whiskey-gold/20 flex items-center justify-center flex-shrink-0">
          <Share2 size={20} className="text-whiskey-gold" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-bold text-whiskey-text">アプリとしてインストール</p>
          <p className="text-xs text-whiskey-muted leading-relaxed">
            下のメニューバーの
            <Share2 size={12} className="inline mx-0.5 text-whiskey-gold" />
            をタップ →「ホーム画面に追加」で、アプリのように使えます
          </p>
        </div>
      </div>
    </div>
  );
}
