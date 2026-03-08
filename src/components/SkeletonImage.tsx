"use client";

import Image from "next/image";
import { useState } from "react";

interface SkeletonImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
}

export default function SkeletonImage({ src, alt, width, height, className = "" }: SkeletonImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative w-full h-full">
      {!loaded && (
        <div className="absolute inset-0 skeleton rounded-inherit" />
      )}
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        className={`${className} ${loaded ? "img-loaded" : "opacity-0"}`}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
