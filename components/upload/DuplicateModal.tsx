"use client";

import React from "react";
import { useVault } from "@/components/providers/VaultContext";
import { Z_INDEX } from "@/lib/tokens/zIndex";
import { AlertCircle, Copy, RefreshCw, Link as LinkIcon, X } from "lucide-react";
import { formatBytes } from "@/lib/utils";

export function DuplicateModal() {
  const { duplicatePrompt, resolveDuplicate } = useVault();

  if (!duplicatePrompt) return null;

  const { file, existingItem } = duplicatePrompt;

  return (
    <div
      style={{ zIndex: Z_INDEX.modalBackdrop }}
      className="fixed inset-0 flex items-center justify-center bg-black/45 dark:bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150"
    >
      <div
        style={{ zIndex: Z_INDEX.modals }}
        className="w-full max-w-md bg-[var(--surface-elevated)] rounded-2xl shadow-[var(--shadow-modal)] border border-[var(--border)] p-6 space-y-5 modal-morph-enter"
      >
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--warning-subtle)] border border-[var(--warning-border)] text-[var(--warning)] flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-[var(--text-primary)]">
              Duplicate Content Detected
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              A file with identical cryptographic checksum (SHA-256) already exists in your vault:
            </p>
          </div>
        </div>

        {/* Existing file card */}
        <div className="p-3 bg-[var(--surface-ground)] rounded-xl border border-[var(--border)] text-xs space-y-1">
          <div className="font-medium text-[var(--text-primary)] truncate">
            {existingItem.name}
          </div>
          <div className="text-[var(--text-muted)] font-mono text-[11px]">
            Size: {formatBytes(existingItem.size)}
          </div>
        </div>

        {/* Action Options */}
        <div className="space-y-2 pt-1">
          <button
            onClick={() => resolveDuplicate("keep_both")}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--surface-hover)] text-left transition-all group"
          >
            <Copy className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent)]" />
            <div>
              <div className="text-xs font-medium text-[var(--text-primary)]">
                Keep Both
              </div>
              <div className="text-[11px] text-[var(--text-muted)]">
                Upload as a separate file with a copy suffix
              </div>
            </div>
          </button>

          <button
            onClick={() => resolveDuplicate("replace")}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--surface-hover)] text-left transition-all group"
          >
            <RefreshCw className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent)]" />
            <div>
              <div className="text-xs font-medium text-[var(--text-primary)]">
                Replace (New Version)
              </div>
              <div className="text-[11px] text-[var(--text-muted)]">
                Updates existing item and creates a version history snapshot
              </div>
            </div>
          </button>

          <button
            onClick={() => resolveDuplicate("shortcut")}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--surface-hover)] text-left transition-all group"
          >
            <LinkIcon className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent)]" />
            <div>
              <div className="text-xs font-medium text-[var(--text-primary)]">
                Create Shortcut / Reference
              </div>
              <div className="text-[11px] text-[var(--text-muted)]">
                Link to the existing item without duplicating storage
              </div>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <button
            onClick={() => resolveDuplicate("cancel")}
            className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
          >
            Cancel Upload
          </button>
        </div>
      </div>
    </div>
  );
}
