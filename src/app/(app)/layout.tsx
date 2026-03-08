import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import AmbientBackground from "@/components/AmbientBackground";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-whiskey-bg relative">
      <AmbientBackground />
      <Header />
      <main className="max-w-[480px] mx-auto px-4 pt-16 pb-20 relative z-10">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
