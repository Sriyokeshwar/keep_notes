"use client";

import React from "react";
import { useVault } from "@/components/providers/VaultContext";
import { Z_INDEX } from "@/lib/tokens/zIndex";
import { UploadCloud, CheckCircle2, Loader2 } from "lucide-react";

export function UploadProgressToast() {
  const { uploadProgress, isUploading } = useVault();

  const files = Object.keys(uploadProgress);
  if (files.length === 0 && !isUploading) return null;

  const total = files.length;
  const completed = files.filter((f) => uploadProgress[f] === 100).length;

  return (
    <div
      style={{ zIndex: Z_INDEX.toasts }}
      className="fixed bottom-6 right-6 w-80 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-2xl shadow-[var(--shadow-popover)] p-4 animate-in slide-in-from-bottom-5 duration-200 select-none"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isUploading ? (
            <Loader2 className="w-4 h-4 text-[var(--accent)] animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />
          )}
          <span className="font-semibold text-xs text-[var(--text-primary)]">
            {isUploading ? `Uploading ${total} ${total === 1 ? "file" : "files"}...` : "Uploads complete"}
          </span>
        </div>
        <span className="text-[11px] font-mono text-[var(--text-muted)]">
          {completed}/{total}
        </span>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {files.map((file) => {
          const prog = uploadProgress[file] || 0;
          return (
            <div key={file} className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="truncate max-w-[180px] text-[var(--text-primary)]">
                  {file}
                </span>
                <span className="font-mono text-[var(--text-muted)]">{prog}%</span>
              </div>
              <div className="w-full h-1 bg-[var(--surface-ground)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)] transition-all duration-300"
                  style={{ width: `${prog}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
