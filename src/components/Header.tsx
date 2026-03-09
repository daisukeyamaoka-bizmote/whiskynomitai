"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";

export default function Header() {
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  const handleScroll = useCallback(() => {
    if (ticking.current) return;
    ticking.current = true;
    requestAnimationFrame(() => {
      const currentY = window.scrollY;
      const diff = currentY - lastScrollY.current;

      if (diff > 8) {
        setVisible(false);
      } else if (diff < -8) {
        setVisible(true);
      }

      if (currentY <= 10) {
        setVisible(true);
      }

      lastScrollY.current = currentY;
      ticking.current = false;
    });
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 glass-header border-b"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        transform: visible ? "translateY(0)" : "translateY(-100%)",
        transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <div className="max-w-[480px] mx-auto px-4 h-14 flex items-center">
        <Link href="/" className="flex flex-col">
          <span className="font-serif text-lg tracking-[0.15em] text-whiskey-gold leading-tight">
            WHISKEY NOMITAI
          </span>
          <span className="text-[10px] text-whiskey-muted leading-tight">
            ウイスキーノミタイ
          </span>
        </Link>
      </div>
    </header>
  );
}
