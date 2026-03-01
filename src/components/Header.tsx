"use client";

import Link from "next/link";
import { User } from "lucide-react";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-whiskey-bg/95 backdrop-blur-sm border-b border-whiskey-border">
      <div className="max-w-[480px] mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex flex-col">
          <span className="font-serif text-lg tracking-[0.15em] text-whiskey-gold leading-tight">
            WHISKEY NOMITAI
          </span>
          <span className="text-[10px] text-whiskey-muted leading-tight">
            ウイスキーノミタイ
          </span>
        </Link>
        <Link
          href="/profile"
          className="w-9 h-9 rounded-full bg-whiskey-card border border-whiskey-border flex items-center justify-center text-whiskey-muted hover:text-whiskey-gold hover:border-whiskey-gold/50 transition-colors"
          aria-label="プロフィール"
        >
          <User size={18} />
        </Link>
      </div>
    </header>
  );
}
