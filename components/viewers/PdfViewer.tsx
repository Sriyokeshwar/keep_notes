"use client";

import React from "react";
import { Download, ExternalLink, X } from "lucide-react";
import { VaultItem } from "@/components/providers/VaultContext";

export function PdfViewer({
  item,
  onClose,
}: {
  item: VaultItem;
  onClose: () => void;
}) {
  const downloadUrl = `/api/items/${item.id}/download`;

  return (
    <div className="relative w-full h-full flex flex-col bg-neutral-900 text-white">
      {/* Top Toolbar */}
      <div className="h-14 px-4 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between z-10">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-xs truncate max-w-sm">{item.name}</span>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in new tab"
            className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-300 transition"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
          <a
            href={downloadUrl}
            download={item.name}
            title="Download PDF"
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

      {/* PDF Iframe */}
      <div className="flex-1 w-full bg-neutral-800">
        <iframe
          src={`${downloadUrl}#toolbar=1&navpanes=0`}
          className="w-full h-full border-none"
          title={item.name}
          sandbox="allow-scripts allow-same-origin allow-forms"
        />
      </div>
    </div>
  );
}
