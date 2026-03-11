"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const supabase = createClient();

  const handleTwitterSignup = async () => {
    setSocialLoading(true);
    setError("");

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "twitter",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(`X連携エラー: ${error.message}`);
      setSocialLoading(false);
    } else if (!data?.url) {
      setError("X連携の接続先URLが取得できませんでした。");
      setSocialLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fullName.trim()) {
      setError("氏名を入力してください");
      return;
    }

    if (password !== confirmPassword) {
      setError("パスワードが一致しません");
      return;
    }

    if (password.length < 6) {
      setError("パスワードは6文字以上にしてください");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: fullName.trim(),
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-whiskey-bg flex items-center justify-center px-4">
        <div className="w-full max-w-[400px] text-center space-y-4">
          <div className="text-whiskey-gold text-5xl">✉</div>
          <h2 className="text-xl text-whiskey-text">確認メールを送信しました</h2>
          <p className="text-whiskey-muted text-sm">
            {email} に確認メールを送信しました。
            メール内のリンクをクリックしてアカウントを有効化してください。
          </p>
          <Link
            href="/login"
            className="inline-block text-whiskey-gold hover:text-whiskey-gold-dark transition-colors text-sm"
          >
            ログインページに戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-whiskey-bg flex items-center justify-center px-4">
      <div className="w-full max-w-[400px] space-y-8">
        {/* Logo */}
        <div className="text-center">
          <h1 className="font-serif text-3xl tracking-[0.2em] text-whiskey-gold">
            WHISKEY NOMITAI
          </h1>
          <p className="text-whiskey-muted text-sm mt-1">新規登録</p>
        </div>

        {/* Signup Form */}
        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label
              htmlFor="fullName"
              className="block text-sm text-whiskey-muted mb-1"
            >
              氏名
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full glass-input px-4 py-3 text-whiskey-text placeholder:text-whiskey-muted/50"
              placeholder="山田 太郎"
              required
            />
          </div>
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
              placeholder="6文字以上"
              required
            />
          </div>
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm text-whiskey-muted mb-1"
            >
              パスワード（確認）
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full glass-input px-4 py-3 text-whiskey-text placeholder:text-whiskey-muted/50"
              placeholder="パスワードを再入力"
              required
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading || socialLoading}
            className="w-full glass-button text-white font-bold py-3 disabled:opacity-50 active:scale-95 transition-transform"
          >
            {loading ? "登録中..." : "アカウントを作成"}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-whiskey-border/30" />
          <span className="text-whiskey-muted text-xs">または</span>
          <div className="flex-1 h-px bg-whiskey-border/30" />
        </div>

        {/* Twitter/X Signup */}
        <button
          onClick={handleTwitterSignup}
          disabled={loading || socialLoading}
          className="w-full flex items-center justify-center gap-3 border border-whiskey-border/30 rounded-lg py-3 text-whiskey-text hover:bg-whiskey-gold/5 transition-colors disabled:opacity-50 active:scale-95"
        >
          <svg viewBox="0 0 24 24" width={18} height={18} className="fill-current">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          <span className="font-bold text-sm">
            {socialLoading ? "接続中..." : "Xで登録"}
          </span>
        </button>

        {/* Login link */}
        <p className="text-center text-whiskey-muted text-sm">
          すでにアカウントをお持ちの方は{" "}
          <Link
            href="/login"
            className="text-whiskey-gold hover:text-whiskey-gold-dark transition-colors"
          >
            ログイン
          </Link>
        </p>
      </div>
    </div>
  );
}
