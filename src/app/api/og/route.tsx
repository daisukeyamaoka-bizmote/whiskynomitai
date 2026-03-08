import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name") || "ウイスキー";
  const rating = searchParams.get("rating") || "0";
  const distillery = searchParams.get("distillery") || "";
  const region = searchParams.get("region") || "";
  const type = searchParams.get("type") || "";
  const tags = searchParams.get("tags") || "";
  const photoUrl = searchParams.get("photo") || "";
  const userName = searchParams.get("user") || "";

  const subInfo = [distillery, region, type].filter(Boolean).join(" / ");
  const tagList = tags ? tags.split(",").slice(0, 4) : [];
  const ratingNum = parseInt(rating) || 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200",
          height: "630",
          display: "flex",
          background: "#0f0d0a",
          fontFamily: "sans-serif",
        }}
      >
        {/* Left: Photo area */}
        <div
          style={{
            width: "480",
            height: "630",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                background: "linear-gradient(135deg, #1a1a1a, #2a2a2a)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "80",
              }}
            >
              🥃
            </div>
          )}
        </div>

        {/* Right: Info area */}
        <div
          style={{
            flex: 1,
            padding: "48px 48px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            borderLeft: "2px solid #d4af3740",
          }}
        >
          {/* App branding */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8",
              marginBottom: "24",
            }}
          >
            <span style={{ fontSize: "14", color: "#d4af37", letterSpacing: "0.15em", fontWeight: "bold" }}>
              WHISKEY NOMITAI
            </span>
          </div>

          {/* Whiskey name */}
          <div
            style={{
              fontSize: name.length > 20 ? "32" : "40",
              fontWeight: "bold",
              color: "#d4af37",
              marginBottom: "8",
              lineHeight: "1.2",
              display: "flex",
            }}
          >
            {name.length > 30 ? name.slice(0, 30) + "..." : name}
          </div>

          {/* Sub info */}
          {subInfo && (
            <div
              style={{
                fontSize: "18",
                color: "#888",
                marginBottom: "24",
                display: "flex",
              }}
            >
              {subInfo}
            </div>
          )}

          {/* Rating */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "8",
              marginBottom: "24",
            }}
          >
            <span style={{ fontSize: "64", fontWeight: "bold", color: "#d4af37" }}>
              {rating}
            </span>
            <span style={{ fontSize: "24", color: "#888" }}>/10</span>
          </div>

          {/* Rating dots */}
          <div style={{ display: "flex", gap: "8", marginBottom: "24" }}>
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: "24",
                  height: "24",
                  borderRadius: "50%",
                  background: i < ratingNum ? "#d4af37" : "transparent",
                  border: i < ratingNum ? "none" : "2px solid #444",
                }}
              />
            ))}
          </div>

          {/* Flavor tags */}
          {tagList.length > 0 && (
            <div style={{ display: "flex", gap: "8", flexWrap: "wrap", marginBottom: "24" }}>
              {tagList.map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: "14",
                    color: "#d4af37",
                    background: "#d4af3715",
                    padding: "4px 12px",
                    borderRadius: "20",
                    border: "1px solid #d4af3730",
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* User name */}
          {userName && (
            <div style={{ fontSize: "14", color: "#666", display: "flex" }}>
              by {userName}
            </div>
          )}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
