"use client";

import Link from "next/link";
import { User } from "lucide-react";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-header border-b">
      <div className="max-w-[480px] mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex flex-col group">
          <span className="font-serif text-lg tracking-[0.15em] text-whiskey-gold leading-tight transition-all duration-200 group-hover:tracking-[0.2em] group-hover:text-shadow-lg"
            style={{ textShadow: "0 0 20px rgba(228, 184, 74, 0.2)" }}
          >
            WHISKEY NOMITAI
          </span>
          <span className="text-[10px] text-whiskey-muted leading-tight">
            ウイスキーノミタイ
          </span>
        </Link>
        <Link
          href="/profile"
          className="w-9 h-9 rounded-full flex items-center justify-center text-whiskey-muted hover:text-whiskey-gold transition-all duration-200 active:scale-[0.85]"
          style={{
            background: "rgba(228, 184, 74, 0.06)",
            border: "1px solid rgba(228, 184, 74, 0.15)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            transitionTimingFunction: "cubic-bezier(0.2, 0.8, 0.2, 1)",
          }}
          aria-label="プロフィール"
        >
          <User size={18} />
        </Link>
      </div>
    </header>
  );
}
