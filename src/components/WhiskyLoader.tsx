"use client";

export default function WhiskyLoader({ text }: { text?: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 animate-fadeIn">
      {/* Glass */}
      <div className="relative w-14 h-20">
        {/* Steam particles */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-whiskey-gold/30" style={{ animation: "glassSteam 1.8s ease-out infinite" }} />
          <div className="w-1 h-1 rounded-full bg-whiskey-gold/20" style={{ animation: "glassSteam 2.2s ease-out 0.5s infinite" }} />
          <div className="w-1.5 h-1.5 rounded-full bg-whiskey-gold/25" style={{ animation: "glassSteam 2s ease-out 1s infinite" }} />
        </div>

        {/* Glass body */}
        <div className="absolute inset-0 rounded-b-xl border-2 border-whiskey-gold/20 bg-whiskey-gold/[0.03] overflow-hidden">
          {/* Whisky liquid filling up */}
          <div
            className="absolute bottom-0 left-0 right-0 rounded-b-lg"
            style={{
              animation: "whiskyPour 2.5s ease-in-out infinite",
              background: "linear-gradient(to top, rgba(180, 120, 30, 0.7), rgba(228, 184, 74, 0.5))",
            }}
          >
            {/* Wave surface */}
            <div
              className="absolute top-0 left-0 right-0 h-1.5 rounded-full"
              style={{
                animation: "whiskyWave 1.2s ease-in-out infinite",
                background: "linear-gradient(to right, transparent, rgba(255, 220, 120, 0.4), transparent)",
              }}
            />
          </div>

          {/* Drip stream */}
          <div
            className="absolute left-1/2 -translate-x-1/2 w-1 rounded-full bg-whiskey-gold/50"
            style={{ animation: "whiskyDrip 2.5s ease-in infinite" }}
          />
        </div>

        {/* Glass base */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-whiskey-gold/15" />
      </div>

      {text && (
        <p className="text-whiskey-muted text-sm">{text}</p>
      )}
    </div>
  );
}
