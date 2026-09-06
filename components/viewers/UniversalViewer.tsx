"use client";

import React from "react";
import { useVault } from "@/components/providers/VaultContext";
import { Z_INDEX } from "@/lib/tokens/zIndex";
import { ImageViewer } from "./ImageViewer";
import { PdfViewer } from "./PdfViewer";
import { AudioPlayer } from "./AudioPlayer";
import { VideoPlayer } from "./VideoPlayer";
import { DocumentViewer } from "./DocumentViewer";
import { getViewerType } from "@/lib/utils/mime";

export function UniversalViewer() {
  const { previewItem, isPreviewOpen, closePreview } = useVault();

  if (!isPreviewOpen || !previewItem) return null;

  const viewerType = getViewerType(previewItem.mimeType, previewItem.name);

  return (
    <div
      style={{ zIndex: Z_INDEX.modals }}
      className="fixed inset-0 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150"
    >
      {viewerType === "audio" ? (
        <AudioPlayer item={previewItem} onClose={closePreview} />
      ) : (
        <div className="w-full h-full max-w-5xl max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl border border-neutral-800 bg-neutral-900 flex flex-col">
          {viewerType === "image" && (
            <ImageViewer item={previewItem} onClose={closePreview} />
          )}
          {viewerType === "pdf" && (
            <PdfViewer item={previewItem} onClose={closePreview} />
          )}
          {viewerType === "video" && (
            <VideoPlayer item={previewItem} onClose={closePreview} />
          )}
          {(viewerType === "text" || viewerType === "office" || viewerType === "archive" || viewerType === "other") && (
            <DocumentViewer item={previewItem} onClose={closePreview} />
          )}
        </div>
      )}
    </div>
  );
}
