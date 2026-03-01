import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ウイスキーノミタイ - あなただけのウイスキージャーナル",
  description:
    "ボトルを撮影するだけ。AIが自動識別、好みを学習、次の一杯をサジェスト。",
  manifest: "/manifest.json",
  openGraph: {
    title: "ウイスキーノミタイ",
    description:
      "ボトルを撮影するだけ。AIが自動識別、好みを学習、次の一杯をサジェスト。",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f0d0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=Noto+Sans+JP:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
