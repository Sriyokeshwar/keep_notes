"use client";

import React, { useState } from "react";
import { ZoomIn, ZoomOut, RotateCw, Download, X } from "lucide-react";
import { VaultItem } from "@/components/providers/VaultContext";

export function ImageViewer({
  item,
  onClose,
}: {
  item: VaultItem;
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const downloadUrl = `/api/items/${item.id}/download`;

  return (
    <div className="relative w-full h-full flex flex-col bg-neutral-950 text-white select-none">
      {/* Top Toolbar */}
      <div className="h-14 px-4 bg-neutral-900/80 border-b border-neutral-800 flex items-center justify-between z-10">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-xs truncate max-w-sm">{item.name}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            title="Zoom Out"
            className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-300 transition"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono text-neutral-400 w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            title="Zoom In"
            className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-300 transition"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleRotate}
            title="Rotate 90°"
            className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-300 transition"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <a
            href={downloadUrl}
            download={item.name}
            title="Download"
            className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-300 transition"
          >
            <Download className="w-4 h-4" />
          </a>
          <button
            onClick={onClose}
            title="Close"
            className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-300 transition ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Image Canvas */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={downloadUrl}
          alt={item.name}
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            transition: "transform 0.15s ease-out",
          }}
          className="max-h-[80vh] max-w-[85vw] object-contain drop-shadow-2xl"
        />
      </div>
    </div>
  );
}
