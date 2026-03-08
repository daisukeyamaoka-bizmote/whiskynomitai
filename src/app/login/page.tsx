"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("メールアドレスまたはパスワードが正しくありません");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-whiskey-bg flex items-center justify-center px-4">
      <div className="w-full max-w-[400px] space-y-8">
        {/* Logo */}
        <div className="text-center">
          <h1 className="font-serif text-3xl tracking-[0.2em] text-whiskey-gold">
            WHISKEY NOMITAI
          </h1>
          <p className="text-whiskey-muted text-sm mt-1">ウイスキーノミタイ</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm text-whiskey-muted mb-1"
            >
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-whiskey-card border border-whiskey-border rounded-lg px-4 py-3 text-whiskey-text placeholder:text-whiskey-muted/50 focus:outline-none focus:border-whiskey-gold transition-colors"
              placeholder="email@example.com"
              required
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm text-whiskey-muted mb-1"
            >
              パスワード
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-whiskey-card border border-whiskey-border rounded-lg px-4 py-3 text-whiskey-text placeholder:text-whiskey-muted/50 focus:outline-none focus:border-whiskey-gold transition-colors"
              placeholder="パスワード"
              required
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-whiskey-gold hover:bg-whiskey-gold-dark text-whiskey-bg font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? "ログイン中..." : "ログイン"}
          </button>
        </form>

        {/* Sign up link */}
        <p className="text-center text-whiskey-muted text-sm">
          アカウントをお持ちでない方は{" "}
          <Link
            href="/signup"
            className="text-whiskey-gold hover:text-whiskey-gold-dark transition-colors"
          >
            新規登録
          </Link>
        </p>
      </div>
    </div>
  );
}
