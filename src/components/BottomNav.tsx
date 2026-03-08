"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Camera, LayoutGrid, Newspaper } from "lucide-react";

const navItems = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/timeline", label: "ウイ活", icon: Newspaper },
  { href: "/record", label: "記録", icon: Camera },
  { href: "/collection", label: "コレクション", icon: LayoutGrid },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-nav border-t">
      <div className="max-w-[480px] mx-auto flex">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center py-2 gap-0.5 transition-all duration-300 active:scale-90 ${
                isActive
                  ? "text-whiskey-gold"
                  : "text-whiskey-muted hover:text-whiskey-text"
              }`}
              aria-label={label}
            >
              <div className={`transition-transform duration-300 ${isActive ? "scale-110 -translate-y-0.5" : ""}`}>
                <Icon size={20} />
              </div>
              <span className="text-[10px]">{label}</span>
              {isActive && (
                <div className="absolute bottom-0 w-8 h-0.5 bg-whiskey-gold rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
