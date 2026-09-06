"use client";

import React, { useEffect, useState } from "react";
import { Download, FileText, FileSpreadsheet, Presentation, X } from "lucide-react";
import { VaultItem } from "@/components/providers/VaultContext";
import { formatBytes, formatDate } from "@/lib/utils";

export function DocumentViewer({
  item,
  onClose,
}: {
  item: VaultItem;
  onClose: () => void;
}) {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const downloadUrl = `/api/items/${item.id}/download`;
  const isText =
    item.mimeType.startsWith("text/") ||
    item.mimeType === "application/json" ||
    /\.(txt|md|json|csv|ts|js|py|html|css|yaml|yml)$/i.test(item.name);

  useEffect(() => {
    if (!isText) return;

    const fetchText = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(downloadUrl);
        if (res.ok) {
          const text = await res.text();
          setTextContent(text);
        }
      } catch (err) {
        console.error("Failed to load text:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchText();
  }, [downloadUrl, isText]);

  return (
    <div className="relative w-full h-full flex flex-col bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">
      {/* Top Bar */}
      <div className="h-14 px-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
        <span className="font-medium text-xs truncate max-w-sm">{item.name}</span>

        <div className="flex items-center gap-2">
          <a
            href={downloadUrl}
            download={item.name}
            title="Download file"
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </a>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-6">
        {isText ? (
          isLoading ? (
            <div className="flex items-center justify-center h-full text-xs text-neutral-400">
              Loading document content...
            </div>
          ) : (
            <pre className="p-4 bg-neutral-50 dark:bg-neutral-950 rounded-xl border border-neutral-200 dark:border-neutral-800 font-mono text-xs whitespace-pre-wrap leading-relaxed overflow-x-auto text-neutral-800 dark:text-neutral-200">
              {textContent || "(Empty file)"}
            </pre>
          )
        ) : (
          /* Office doc / Unknown fallback card */
          <div className="max-w-md mx-auto my-12 p-8 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/80 rounded-2xl text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center shadow-xs">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-semibold text-base mb-1">{item.name}</h3>
              <p className="text-xs text-neutral-500">
                {item.mimeType} &bull; {formatBytes(item.size)}
              </p>
            </div>
            <p className="text-xs text-neutral-500">
              In-browser preview is not supported for this document type. You can download the file to open it with your desktop application.
            </p>
            <div className="pt-2">
              <a
                href={downloadUrl}
                download={item.name}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-500/20 transition"
              >
                <Download className="w-4 h-4" />
                <span>Download {formatBytes(item.size)}</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
