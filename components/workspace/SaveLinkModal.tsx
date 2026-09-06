"use client";

import React, { useState } from "react";
import { useVault } from "@/components/providers/VaultContext";
import { Z_INDEX } from "@/lib/tokens/zIndex";
import { Link as LinkIcon, X, Loader2 } from "lucide-react";

export function SaveLinkModal() {
  const { isSaveLinkOpen, setIsSaveLinkOpen, currentFolderId, refreshData } = useVault();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          title: title.trim() || undefined,
          folderId: currentFolderId,
        }),
      });

      if (res.ok) {
        setUrl("");
        setTitle("");
        setIsSaveLinkOpen(false);
        refreshData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to save link");
      }
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isSaveLinkOpen) return null;

  return (
    <div
      style={{ zIndex: Z_INDEX.modalBackdrop }}
      className="fixed inset-0 flex items-center justify-center bg-black/45 dark:bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150"
    >
      <div
        style={{ zIndex: Z_INDEX.modals }}
        className="w-full max-w-sm bg-[var(--surface-elevated)] rounded-2xl shadow-[var(--shadow-modal)] border border-[var(--border)] p-6 space-y-4 modal-morph-enter"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-[var(--accent)]" />
            <h3 className="font-semibold text-sm text-[var(--text-primary)]">Save Link</h3>
          </div>
          <button
            onClick={() => setIsSaveLinkOpen(false)}
            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
              Web Address (URL)
            </label>
            <input
              type="url"
              required
              autoFocus
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/article"
              className="w-full px-3 py-2 bg-[var(--surface-ground)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
              Title (Optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Leave blank to auto-fetch title"
              className="w-full px-3 py-2 bg-[var(--surface-ground)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent)]"
            />
            <p className="text-[10px] text-[var(--text-muted)] mt-1">
              Favicon, domain, and OpenGraph preview images will be extracted automatically.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsSaveLinkOpen(false)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !url.trim()}
              className="px-4 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] rounded-xl text-xs font-medium shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isSubmitting ? "Fetching..." : "Save Link"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
