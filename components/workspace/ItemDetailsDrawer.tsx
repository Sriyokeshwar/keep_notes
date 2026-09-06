"use client";

import React, { useState } from "react";
import { useVault, VaultItem } from "@/components/providers/VaultContext";
import { Z_INDEX } from "@/lib/tokens/zIndex";
import {
  X,
  FileText,
  Calendar,
  HardDrive,
  Tag as TagIcon,
  Shield,
  Download,
  Trash2,
  Share2,
  Copy,
  Check,
} from "lucide-react";
import { formatBytes, formatDate } from "@/lib/utils";

export function ItemDetailsDrawer() {
  const { detailsItem, isDetailsOpen, closeDetails, openShare, refreshData } = useVault();
  const [newTag, setNewTag] = useState("");
  const [copiedHash, setCopiedHash] = useState(false);

  if (!isDetailsOpen || !detailsItem) return null;

  const item = detailsItem;

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag.trim()) return;

    const currentTags = item.tags || [];
    if (currentTags.includes(newTag.trim())) {
      setNewTag("");
      return;
    }

    const updated = [...currentTags, newTag.trim()];
    try {
      await fetch(`/api/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: updated }),
      });
      item.tags = updated;
      setNewTag("");
      refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    const updated = (item.tags || []).filter((t) => t !== tagToRemove);
    try {
      await fetch(`/api/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: updated }),
      });
      item.tags = updated;
      refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyChecksum = () => {
    if (item.checksum) {
      navigator.clipboard.writeText(item.checksum);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  return (
    <div
      style={{ zIndex: Z_INDEX.modalBackdrop }}
      className="fixed inset-0 flex justify-end bg-black/45 dark:bg-black/70 backdrop-blur-xs"
    >
      <div
        style={{ zIndex: Z_INDEX.drawers }}
        className="w-full max-w-md bg-[var(--surface-elevated)] h-full shadow-[var(--shadow-modal)] flex flex-col border-l border-[var(--border)] animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <h3 className="font-semibold text-sm">Item Details</h3>
          <button
            onClick={closeDetails}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* File summary */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h4 className="font-semibold text-sm truncate text-neutral-900 dark:text-neutral-100">
                {item.name}
              </h4>
              <p className="text-xs text-neutral-500 capitalize">{item.type}</p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <a
              href={`/api/items/${item.id}/download`}
              download={item.name}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-xl text-xs font-medium transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>
            <button
              onClick={() => {
                closeDetails();
                openShare({ type: "item", id: item.id, name: item.name });
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-xl text-xs font-medium transition"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
          </div>

          {/* Metadata Grid (§17) */}
          <div className="space-y-3 pt-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-neutral-100 dark:border-neutral-800">
              <span className="text-neutral-500">MIME Type</span>
              <span className="font-mono text-neutral-700 dark:text-neutral-300">
                {item.mimeType}
              </span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-neutral-100 dark:border-neutral-800">
              <span className="text-neutral-500">File Size</span>
              <span className="font-mono text-neutral-700 dark:text-neutral-300">
                {formatBytes(item.size)}
              </span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-neutral-100 dark:border-neutral-800">
              <span className="text-neutral-500">Storage Provider</span>
              <span className="capitalize font-medium text-neutral-700 dark:text-neutral-300">
                {item.storageProvider === "google_drive" ? "Google Drive" : "Local Vault Storage"}
              </span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-neutral-100 dark:border-neutral-800">
              <span className="text-neutral-500">Created</span>
              <span className="text-neutral-700 dark:text-neutral-300">
                {formatDate(item.createdAt)}
              </span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-neutral-100 dark:border-neutral-800">
              <span className="text-neutral-500">Modified</span>
              <span className="text-neutral-700 dark:text-neutral-300">
                {formatDate(item.updatedAt)}
              </span>
            </div>

            {item.checksum && (
              <div className="py-1.5 border-b border-neutral-100 dark:border-neutral-800 space-y-1">
                <div className="flex items-center justify-between text-neutral-500">
                  <span>SHA-256 Checksum</span>
                  <button
                    onClick={handleCopyChecksum}
                    className="flex items-center gap-1 text-[10px] text-indigo-600 hover:underline"
                  >
                    {copiedHash ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedHash ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <div className="font-mono text-[10px] text-neutral-400 break-all bg-neutral-50 dark:bg-neutral-800 p-2 rounded-lg">
                  {item.checksum}
                </div>
              </div>
            )}
          </div>

          {/* Tags Section */}
          <div className="space-y-2 pt-2">
            <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
              <TagIcon className="w-3.5 h-3.5" />
              <span>Tags</span>
            </span>

            <div className="flex flex-wrap gap-1.5">
              {(item.tags || []).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs"
                >
                  <span>#{tag}</span>
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-red-500 text-indigo-400"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>

            <form onSubmit={handleAddTag} className="flex gap-1.5 pt-1">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add a tag..."
                className="flex-1 px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs focus:outline-none"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-lg text-xs font-semibold"
              >
                Add
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
