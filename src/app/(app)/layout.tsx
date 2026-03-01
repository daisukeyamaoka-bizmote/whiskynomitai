export const dynamic = "force-dynamic";

import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-whiskey-bg">
      <Header />
      <main className="max-w-[480px] mx-auto px-4 pt-16 pb-20">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
