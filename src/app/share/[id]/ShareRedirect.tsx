"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ShareRedirect({ postId }: { postId: string }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/?post=${postId}`);
  }, [router, postId]);

  return (
    <div
      style={{
        background: "#0f0d0a",
        color: "#d4af37",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        fontFamily: "sans-serif",
      }}
    >
      <p>リダイレクト中...</p>
    </div>
  );
}
