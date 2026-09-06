"use client";

import React, { useState } from "react";
import { useVault } from "@/components/providers/VaultContext";
import { Z_INDEX } from "@/lib/tokens/zIndex";
import { FOLDER_ACCENTS } from "@/lib/tokens/theme";
import { FolderPlus, X } from "lucide-react";

export function NewFolderModal() {
  const { isNewFolderOpen, setIsNewFolderOpen, currentFolderId, refreshData } = useVault();
  const [folderName, setFolderName] = useState("");
  const [selectedColor, setSelectedColor] = useState(FOLDER_ACCENTS[0].hex);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: folderName.trim(),
          parentFolderId: currentFolderId,
          color: selectedColor,
        }),
      });

      if (res.ok) {
        setFolderName("");
        setIsNewFolderOpen(false);
        refreshData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create folder");
      }
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isNewFolderOpen) return null;

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
            <FolderPlus className="w-5 h-5 text-[var(--accent)]" />
            <h3 className="font-semibold text-sm text-[var(--text-primary)]">New Folder</h3>
          </div>
          <button
            onClick={() => setIsNewFolderOpen(false)}
            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
              Folder Name
            </label>
            <input
              type="text"
              required
              autoFocus
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="e.g. Projects, Archival Notes, Research"
              className="w-full px-3 py-2 bg-[var(--surface-ground)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
              Color Accent
            </label>
            <div className="flex items-center gap-2">
              {FOLDER_ACCENTS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedColor(c.hex)}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                  className={`w-6 h-6 rounded-full border-2 transition ${
                    selectedColor === c.hex
                      ? "border-[var(--text-primary)] scale-110 shadow-xs"
                      : "border-transparent opacity-80 hover:opacity-100"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsNewFolderOpen(false)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !folderName.trim()}
              className="px-4 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] rounded-xl text-xs font-medium shadow-xs transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
