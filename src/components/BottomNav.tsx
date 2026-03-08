"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Camera, LayoutGrid, Newspaper, Bell } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";

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
  const [visible, setVisible] = useState(true);
  const prevPathRef = useRef(pathname);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

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
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 glass-nav border-t"
      style={{
        transform: visible ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
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
              className={`relative flex-1 flex flex-col items-center justify-center py-4 transition-colors duration-200 active:scale-90 ${
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
                <Icon size={26} strokeWidth={isActive ? 2.2 : 1.5} />
              </div>
              {isActive && (
                <div className="absolute bottom-1 w-6 h-[2.5px] rounded-full bg-whiskey-gold" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
