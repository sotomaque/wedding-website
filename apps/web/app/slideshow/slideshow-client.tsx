"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "react-qr-code";

interface GuestPhoto {
  id: string;
  url: string;
  uploader_name: string | null;
  uploaded_at: string;
}

interface SlideshowClientProps {
  photos: GuestPhoto[];
  uploadUrl: string;
}

function shuffle(arr: GuestPhoto[]): GuestPhoto[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i];
    const src = a[j];
    if (tmp !== undefined && src !== undefined) {
      a[i] = src;
      a[j] = tmp;
    }
  }
  return a;
}

export function SlideshowClient({ photos, uploadUrl }: SlideshowClientProps) {
  const shuffled = useMemo(() => shuffle(photos), [photos]);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const router = useRouter();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-advance every 5 seconds with crossfade
  useEffect(() => {
    if (shuffled.length <= 1) return;

    intervalRef.current = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % shuffled.length);
        setVisible(true);
      }, 600);
    }, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [shuffled.length]);

  // Poll for new photos every 30 seconds
  useEffect(() => {
    const poll = setInterval(() => {
      router.refresh();
    }, 30_000);
    return () => clearInterval(poll);
  }, [router]);

  if (shuffled.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black text-white gap-4">
        <p className="text-2xl font-serif opacity-60">No photos yet</p>
        <p className="text-sm opacity-40 text-center px-4">
          Guests can scan the QR code to upload
        </p>
        <div className="mt-4 bg-white p-3 rounded-lg">
          <QRCode value={uploadUrl} size={140} />
        </div>
        <p className="text-xs opacity-30 font-mono">{uploadUrl}</p>
      </div>
    );
  }

  const current = shuffled[index];
  if (!current) return null;

  return (
    <div className="relative h-screen w-screen bg-black overflow-hidden">
      {/* Photo */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{ opacity: visible ? 1 : 0 }}
      >
        <Image
          src={current.url}
          alt={
            current.uploader_name
              ? `Photo by ${current.uploader_name}`
              : "Wedding photo"
          }
          fill
          className="object-contain"
          priority
          unoptimized
        />
      </div>

      {/* Uploader name */}
      {current.uploader_name && (
        <div
          className="absolute bottom-8 left-8 transition-opacity duration-500"
          style={{ opacity: visible ? 1 : 0 }}
        >
          <p className="text-white/80 text-sm font-medium bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm">
            📸 {current.uploader_name}
          </p>
        </div>
      )}

      {/* Live badge + counter */}
      <div className="absolute top-6 right-6 flex items-center gap-3">
        <span className="text-white/50 text-xs font-mono">
          {index + 1} / {shuffled.length}
        </span>
        <span className="flex items-center gap-1.5 bg-black/40 text-white/80 text-xs px-2.5 py-1 rounded-full backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
          Live
        </span>
      </div>

      {/* QR code — bottom right */}
      <div className="absolute bottom-6 right-6 flex flex-col items-center gap-1.5">
        <div className="bg-white p-2 rounded-md shadow-lg">
          <QRCode value={uploadUrl} size={72} />
        </div>
        <p className="text-white/50 text-xs">Share your photos</p>
      </div>

      {/* Manual nav */}
      <button
        type="button"
        aria-label="Previous photo"
        onClick={() => {
          setVisible(false);
          setTimeout(() => {
            setIndex((i) => (i - 1 + shuffled.length) % shuffled.length);
            setVisible(true);
          }, 300);
        }}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors text-3xl px-2"
      >
        ‹
      </button>
      <button
        type="button"
        aria-label="Next photo"
        onClick={() => {
          setVisible(false);
          setTimeout(() => {
            setIndex((i) => (i + 1) % shuffled.length);
            setVisible(true);
          }, 300);
        }}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors text-3xl px-2 pr-24"
      >
        ›
      </button>
    </div>
  );
}
