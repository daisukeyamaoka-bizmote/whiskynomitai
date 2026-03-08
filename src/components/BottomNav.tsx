"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Camera, LayoutGrid, Newspaper } from "lucide-react";

const navItems = [
  { href: "/", label: "マイページ", icon: User },
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
              className={`relative flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-[color,transform] duration-100 ease-out active:scale-90 ${
                isActive
                  ? "text-whiskey-gold"
                  : "text-whiskey-muted hover:text-whiskey-text"
              }`}
              aria-label={label}
            >
              <div className={`transition-transform duration-100 ease-out ${isActive ? "scale-110 -translate-y-0.5" : ""}`}>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              </div>
              <span className={`text-[10px] ${isActive ? "font-bold" : ""}`}>
                {label}
              </span>
              {isActive && (
                <div
                  className="absolute bottom-0 w-10 h-[3px] rounded-full"
                  style={{
                    background: "linear-gradient(90deg, transparent, rgba(228, 184, 74, 0.8), transparent)",
                  }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
