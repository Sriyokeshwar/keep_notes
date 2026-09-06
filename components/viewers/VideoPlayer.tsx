"use client";

import React, { useRef, useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { VaultItem } from "@/components/providers/VaultContext";

export function VideoPlayer({
  item,
  onClose,
}: {
  item: VaultItem;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamUrl = `/api/items/${item.id}/stream`;
  const downloadUrl = `/api/items/${item.id}/download`;

  // Remember position (§16)
  useEffect(() => {
    const savedPos = localStorage.getItem(`video_pos_${item.id}`);
    if (savedPos && videoRef.current) {
      const pos = parseFloat(savedPos);
      if (!isNaN(pos) && pos > 0) {
        videoRef.current.currentTime = pos;
      }
    }
  }, [item.id]);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    localStorage.setItem(`video_pos_${item.id}`, videoRef.current.currentTime.toString());
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-black text-white">
      {/* Top Bar */}
      <div className="h-14 px-4 bg-neutral-900/80 border-b border-neutral-800 flex items-center justify-between z-10">
        <span className="font-medium text-xs truncate max-w-sm">{item.name}</span>

        <div className="flex items-center gap-2">
          <a
            href={downloadUrl}
            download={item.name}
            title="Download Video"
            className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-300 transition"
          >
            <Download className="w-4 h-4" />
          </a>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-300 transition ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Video element streaming via HTTP 206 */}
      <div className="flex-1 flex items-center justify-center p-4 bg-black">
        <video
          ref={videoRef}
          src={streamUrl}
          controls
          autoPlay
          onTimeUpdate={handleTimeUpdate}
          className="max-h-[80vh] max-w-[90vw] rounded-lg shadow-2xl"
        >
          Your browser does not support HTML5 video streaming.
        </video>
      </div>
    </div>
  );
}
