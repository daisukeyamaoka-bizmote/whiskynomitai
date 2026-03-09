import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.whiskynomitai",
  appName: "ウイスキーのみたい",
  webDir: "out",

  // WebView方式: Vercelにデプロイ済みのURLを読み込む
  server: {
    url: "https://whiskynomitai.vercel.app",
    cleartext: false,
  },

  ios: {
    // ステータスバーのオーバーレイ
    contentInset: "always",
    // スクロールの慣性
    scrollEnabled: true,
    // 背景色（スプラッシュ後に見える色）
    backgroundColor: "#0a0a0a",
    // スキーム
    scheme: "whiskynomitai",
  },
};

export default config;
