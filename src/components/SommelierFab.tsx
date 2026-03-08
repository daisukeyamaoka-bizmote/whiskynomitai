"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wine } from "lucide-react";

export default function SommelierFab() {
  const pathname = usePathname();

  // Hide on the sommelier page itself
  if (pathname === "/sommelier") return null;

  return (
    <Link
      href="/sommelier"
      className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full glass-button text-whiskey-bg flex items-center justify-center shadow-lg active:scale-90 animate-fadeInScale"
      style={{
        boxShadow: "0 4px 20px rgba(228, 184, 74, 0.35), 0 0 40px rgba(228, 184, 74, 0.1)",
      }}
      aria-label="AIソムリエ"
    >
      <Wine size={22} />
    </Link>
  );
}
