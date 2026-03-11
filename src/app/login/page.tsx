"use client";

import { useState, useEffect, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam && errorParam !== "auth_failed") {
      setError(`認証エラー: ${decodeURIComponent(errorParam)}`);
    } else if (errorParam === "auth_failed") {
      setError("認証に失敗しました。もう一度お試しください。");
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        setError("メールアドレスまたはパスワードが正しくありません");
      } else if (error.message.includes("Email not confirmed")) {
        setError("メールアドレスが未確認です。確認メールのリンクをクリックしてください。");
      } else {
        setError(`ログインエラー: ${error.message}`);
      }
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  };

  const handleTwitterLogin = async () => {
    setSocialLoading(true);
    setError("");

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "twitter",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(`Xログインエラー: ${error.message}`);
      setSocialLoading(false);
    } else if (!data?.url) {
      setError("Xログインの接続先URLが取得できませんでした。");
      setSocialLoading(false);
    }
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
              className="w-full glass-input px-4 py-3 text-whiskey-text placeholder:text-whiskey-muted/50"
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
              className="w-full glass-input px-4 py-3 text-whiskey-text placeholder:text-whiskey-muted/50"
              placeholder="パスワード"
              required
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || socialLoading}
            className="w-full glass-button text-white font-bold py-3 disabled:opacity-50 active:scale-95 transition-transform"
          >
            {loading ? "ログイン中..." : "ログイン"}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-whiskey-border/30" />
          <span className="text-whiskey-muted text-xs">または</span>
          <div className="flex-1 h-px bg-whiskey-border/30" />
        </div>

        {/* Twitter/X Login */}
        <button
          onClick={handleTwitterLogin}
          disabled={loading || socialLoading}
          className="w-full flex items-center justify-center gap-3 border border-whiskey-border/30 rounded-lg py-3 text-whiskey-text hover:bg-whiskey-gold/5 transition-colors disabled:opacity-50 active:scale-95"
        >
          <svg viewBox="0 0 24 24" width={18} height={18} className="fill-current">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          <span className="font-bold text-sm">
            {socialLoading ? "接続中..." : "Xでログイン"}
          </span>
        </button>

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

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
