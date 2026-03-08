"use client";

import Link from "next/link";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-header border-b">
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
