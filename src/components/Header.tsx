"use client";

import Link from "next/link";
import { User } from "lucide-react";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-header border-b">
      <div className="max-w-[480px] mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex flex-col group">
          <span className="font-serif text-lg tracking-[0.15em] text-whiskey-gold leading-tight transition-all duration-300 group-hover:tracking-[0.2em]">
            WHISKEY NOMITAI
          </span>
          <span className="text-[10px] text-whiskey-muted leading-tight">
            ウイスキーノミタイ
          </span>
        </Link>
        <Link
          href="/profile"
          className="w-9 h-9 rounded-full bg-whiskey-gold/5 border border-whiskey-gold/10 flex items-center justify-center text-whiskey-muted hover:text-whiskey-gold hover:border-whiskey-gold/30 hover:bg-whiskey-gold/10 transition-all duration-300 hover:scale-105 active:scale-95"
          aria-label="プロフィール"
        >
          <User size={18} />
        </Link>
      </div>
    </header>
  );
}
