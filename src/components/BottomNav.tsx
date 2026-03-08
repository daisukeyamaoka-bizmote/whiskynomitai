"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Camera, LayoutGrid, Sparkles, Newspaper } from "lucide-react";

const navItems = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/timeline", label: "ウイ活", icon: Newspaper },
  { href: "/record", label: "記録", icon: Camera },
  { href: "/collection", label: "コレクション", icon: LayoutGrid },
  { href: "/suggest", label: "おすすめ", icon: Sparkles },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-whiskey-bg/95 backdrop-blur-sm border-t border-whiskey-border">
      <div className="max-w-[480px] mx-auto flex">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors ${
                isActive
                  ? "text-whiskey-gold"
                  : "text-whiskey-muted hover:text-whiskey-text"
              }`}
              aria-label={label}
            >
              <Icon size={20} />
              <span className="text-[10px]">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
