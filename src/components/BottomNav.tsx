"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Camera, LayoutGrid, Newspaper, Bell } from "lucide-react";
import { useState, useEffect, useRef } from "react";

const navItems = [
  { href: "/", label: "ウイ活", icon: Newspaper },
  { href: "/record", label: "記録", icon: Camera },
  { href: "/notifications", label: "通知", icon: Bell },
  { href: "/collection", label: "コレクション", icon: LayoutGrid },
  { href: "/mypage", label: "マイページ", icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [bouncingIdx, setBouncingIdx] = useState<number | null>(null);
  const prevPathRef = useRef(pathname);

  useEffect(() => {
    if (pathname !== prevPathRef.current) {
      const idx = navItems.findIndex(({ href }) =>
        href === "/" ? pathname === "/" || pathname === "/timeline" : pathname.startsWith(href)
      );
      if (idx !== -1) {
        setBouncingIdx(idx);
        const timer = setTimeout(() => setBouncingIdx(null), 400);
        return () => clearTimeout(timer);
      }
      prevPathRef.current = pathname;
    }
  }, [pathname]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-nav border-t safe-area-bottom">
      <div className="max-w-[480px] mx-auto flex">
        {navItems.map(({ href, label, icon: Icon }, i) => {
          const isActive =
            href === "/"
              ? pathname === "/" || pathname === "/timeline"
              : pathname.startsWith(href);
          const isBouncing = bouncingIdx === i;
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex-1 flex flex-col items-center justify-center py-3 transition-colors duration-200 active:scale-90 ${
                isActive
                  ? "text-whiskey-gold"
                  : "text-whiskey-muted hover:text-whiskey-text"
              }`}
              style={{ transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}
              aria-label={label}
            >
              <div
                className={`will-change-transform ${
                  isBouncing
                    ? "animate-nav-bounce"
                    : isActive
                      ? "scale-110 -translate-y-0.5"
                      : ""
                }`}
                style={{
                  transition: isBouncing ? "none" : "transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
              >
                <Icon size={22} strokeWidth={isActive ? 2.2 : 1.6} />
              </div>
              {isActive && (
                <div className="absolute bottom-0 w-6 h-[2px] rounded-full bg-whiskey-gold" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
