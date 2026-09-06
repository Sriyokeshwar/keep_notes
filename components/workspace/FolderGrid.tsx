"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useVault, VaultFolder, VaultItem } from "@/components/providers/VaultContext";
import { NoteCard } from "@/components/notes/NoteCard";
import {
  Folder,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  FileSpreadsheet,
  Link as LinkIcon,
  Download,
  MoreVertical,
  Share2,
  Trash2,
  Star,
  ExternalLink,
  Plus,
  UploadCloud,
  FileUp,
  Play,
  Activity,
  Tag as TagIcon,
} from "lucide-react";
import { formatBytes, formatDate, cn } from "@/lib/utils";
import { getViewerType } from "@/lib/utils/mime";
import { Z_INDEX } from "@/lib/tokens/zIndex";

export function FolderGrid() {
  const router = useRouter();
  const {
    folders,
    items,
    isLoading,
    openPreview,
    openShare,
    openDetails,
    openNoteEditor,
    setIsNewFolderOpen,
    setIsSaveLinkOpen,
    uploadFiles,
    refreshData,
  } = useVault();

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const handleToggleFavorite = async (e: React.MouseEvent, item: VaultItem) => {
    e.stopPropagation();
    try {
      await fetch(`/api/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: !item.isFavorite }),
      });
      refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFolder = async (e: React.MouseEvent, folderId: string) => {
    e.stopPropagation();
    if (!confirm("Move this folder and all its contents to trash?")) return;
    try {
      await fetch(`/api/folders/${folderId}`, { method: "DELETE" });
      refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-3 select-none">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
        <span className="text-xs text-[var(--text-muted)] font-medium">Loading workspace...</span>
      </div>
    );
  }

  const hasContent = folders.length > 0 || items.length > 0;

  if (!hasContent) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto space-y-4 select-none">
        <div className="w-16 h-16 rounded-3xl bg-[var(--accent-subtle)] border border-[var(--accent-subtle-border)] text-[var(--accent)] flex items-center justify-center shadow-lg transition-transform hover:scale-105">
          <UploadCloud className="w-8 h-8" />
        </div>
        <div>
          <h3 className="font-semibold text-base text-[var(--text-primary)] mb-1.5 tracking-tight">
            This workspace is empty
          </h3>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Drag and drop files anywhere to upload, or use the quick actions below to populate your vault.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <button
            onClick={() => openNoteEditor()}
            className="flex items-center gap-1.5 px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] rounded-xl text-xs font-medium shadow-xs transition-transform active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Note</span>
          </button>
          <button
            onClick={() => setIsNewFolderOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[var(--surface-primary)] border border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] rounded-xl text-xs font-medium transition-transform active:scale-95"
          >
            <Folder className="w-3.5 h-3.5" />
            <span>New Folder</span>
          </button>
          <button
            onClick={() => setIsSaveLinkOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[var(--surface-primary)] border border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] rounded-xl text-xs font-medium transition-transform active:scale-95"
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Bookmark</span>
          </button>
        </div>
      </div>
    );
  }

  // Separate pinned items and regular items
  const pinnedItems = items.filter((i) => i.isPinned);
  const regularItems = items.filter((i) => !i.isPinned);

  return (
    <div className="space-y-8 select-none folder-enter-forward">
      {/* 1. Folders Section */}
      {folders.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Folders ({folders.length})
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {folders.map((folder) => (
              <div
                key={folder.id}
                onDoubleClick={() => router.push(`/vault/${folder.id}`)}
                className="group relative flex items-center justify-between p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--surface-primary)] hover:border-[var(--accent)] spatial-card cursor-pointer shadow-[var(--shadow-card)]"
              >
                <Link
                  href={`/vault/${folder.id}`}
                  className="flex items-center gap-3 min-w-0 flex-1"
                >
                  <Folder
                    className="w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110"
                    style={{ color: folder.color || "var(--accent)" }}
                  />
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-xs truncate block text-[var(--text-primary)]">
                      {folder.name}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] block">
                      {folder.itemCount || 0} items
                    </span>
                  </div>
                </Link>

                <div className="relative flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuId(activeMenuId === folder.id ? null : folder.id);
                    }}
                    className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>

                  {activeMenuId === folder.id && (
                    <div
                      style={{ zIndex: Z_INDEX.dropdowns }}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-full mt-1.5 w-36 glass-modal rounded-xl p-1 text-xs text-[var(--text-primary)] modal-morph-enter"
                    >
                      <button
                        onClick={(e) => {
                          setActiveMenuId(null);
                          openShare({ type: "folder", id: folder.id, name: folder.name });
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-left transition-colors"
                      >
                        <Share2 className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                        <span>Share</span>
                      </button>
                      <button
                        onClick={(e) => handleDeleteFolder(e, folder.id)}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--danger-subtle)] text-[var(--danger)] text-left transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Pinned Items Section */}
      {pinnedItems.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Pinned ({pinnedItems.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {pinnedItems.map((item) =>
              item.type === "note" ? (
                <NoteCard key={item.id} item={item} />
              ) : (
                <ItemCard key={item.id} item={item} />
              )
            )}
          </div>
        </div>
      )}

      {/* 3. Regular Items Section */}
      {regularItems.length > 0 && (
        <div className="space-y-3">
          {pinnedItems.length > 0 && (
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Notes & Files ({regularItems.length})
            </h3>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {regularItems.map((item) =>
              item.type === "note" ? (
                <NoteCard key={item.id} item={item} />
              ) : (
                <ItemCard key={item.id} item={item} />
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-component for Files & Links cards with media-differentiated previews
function ItemCard({ item }: { item: VaultItem }) {
  const { openPreview, openShare, openDetails, refreshData } = useVault();
  const [showMenu, setShowMenu] = useState(false);

  const isLink = item.type === "link";
  const isImage = item.mimeType.startsWith("image/");
  const isVideo = item.mimeType.startsWith("video/");
  const isAudio = item.mimeType.startsWith("audio/");
  const isPdf = item.mimeType === "application/pdf";
  const downloadUrl = `/api/items/${item.id}/download`;

  const handleFavoriteToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: !item.isFavorite }),
      });
      refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/items/${item.id}`, { method: "DELETE" });
      refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div
      onClick={() => {
        if (isLink && item.metadata?.url) {
          window.open(item.metadata.url, "_blank");
        } else {
          openPreview(item);
        }
      }}
      className="group relative rounded-2xl border border-[var(--border)] bg-[var(--surface-primary)] p-3.5 spatial-card flex flex-col justify-between cursor-pointer overflow-hidden select-none shadow-[var(--shadow-card)]"
    >
      {/* Top Media Preview Area */}
      <div className="relative w-full h-34 rounded-xl bg-[var(--surface-ground)] border border-[var(--border-subtle)] flex items-center justify-center overflow-hidden mb-3 group-hover:border-[var(--border)] transition-colors">
        {isImage && item.storageFileId ? (
          // Image Preview
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={downloadUrl}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : isLink ? (
          // Link Bookmark Preview
          item.metadata?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.metadata.image}
              alt={item.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-blue-500">
              <LinkIcon className="w-8 h-8 stroke-[1.5]" />
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--surface-primary)] text-[var(--text-muted)] border border-[var(--border)]">
                {item.metadata?.domain || "Bookmark"}
              </span>
            </div>
          )
        ) : isVideo ? (
          // Video Preview Box
          <div className="flex flex-col items-center justify-center w-full h-full bg-linear-to-b from-violet-500/10 to-violet-500/5 text-violet-500 relative">
            <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
              <Play className="w-5 h-5 fill-current ml-0.5" />
            </div>
            <span className="absolute bottom-2 left-2 text-[10px] font-medium font-mono px-1.5 py-0.5 rounded-md bg-black/40 text-white backdrop-blur-xs">
              VIDEO
            </span>
          </div>
        ) : isAudio ? (
          // Audio Waveform Box
          <div className="flex flex-col items-center justify-center w-full h-full bg-linear-to-b from-amber-500/10 to-amber-500/5 text-amber-500 relative space-y-1.5">
            <div className="flex items-center gap-1">
              {[12, 24, 18, 28, 14, 22, 10, 20].map((h, i) => (
                <span
                  key={i}
                  style={{ height: `${h}px` }}
                  className="w-1 rounded-full bg-amber-500/70"
                />
              ))}
            </div>
            <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">Audio Track</span>
          </div>
        ) : isPdf ? (
          // PDF Document Box
          <div className="flex flex-col items-center justify-center w-full h-full bg-linear-to-b from-rose-500/10 to-rose-500/5 text-rose-500 relative">
            <FileText className="w-9 h-9 stroke-[1.5]" />
            <span className="absolute bottom-2 left-2 text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-md bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              PDF
            </span>
          </div>
        ) : (
          // Generic Document
          <div className="flex flex-col items-center justify-center w-full h-full bg-[var(--surface-ground)] text-[var(--accent)]">
            <FileText className="w-8 h-8 stroke-[1.5]" />
            <span className="text-[10px] font-mono mt-1 text-[var(--text-muted)]">
              {item.mimeType.split("/")[1]?.toUpperCase() || "FILE"}
            </span>
          </div>
        )}

        {/* Favorite Star badge top right */}
        <button
          onClick={handleFavoriteToggle}
          title={item.isFavorite ? "Remove favorite" : "Add to favorites"}
          className={cn(
            "absolute top-2 right-2 p-1.5 rounded-lg bg-[var(--surface-primary)]/90 backdrop-blur-xs border border-[var(--border)] transition shadow-xs opacity-100 sm:opacity-0 sm:group-hover:opacity-100",
            item.isFavorite && "opacity-100 text-amber-500"
          )}
        >
          <Star className={cn("w-3.5 h-3.5", item.isFavorite && "fill-current")} />
        </button>
      </div>

      {/* Item info */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          {isLink && item.metadata?.favicon && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.metadata.favicon}
              alt=""
              className="w-3.5 h-3.5 rounded-xs flex-shrink-0"
            />
          )}
          <h4 className="font-semibold text-xs text-[var(--text-primary)] truncate flex-1 tracking-tight">
            {item.name}
          </h4>
        </div>
        <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] font-mono">
          <span>{isLink ? item.metadata?.domain : formatBytes(item.size)}</span>
          <span>{formatDate(item.createdAt).split(",")[0]}</span>
        </div>

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {item.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-[9px] px-1.5 py-0.5 rounded-md bg-[var(--surface-ground)] text-[var(--text-muted)] border border-[var(--border)] font-medium"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer Action Bar */}
      <div className="pt-2.5 mt-2 border-t border-[var(--border-subtle)] flex items-center justify-between opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        {!isLink && (
          <a
            href={downloadUrl}
            download={item.name}
            onClick={(e) => e.stopPropagation()}
            title="Download"
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
          </a>
        )}

        {isLink && (
          <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
            <ExternalLink className="w-3 h-3" />
            <span>Open Link</span>
          </span>
        )}

        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openShare({ type: "item", id: item.id, name: item.name });
            }}
            title="Share"
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>

          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              title="More"
              className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {showMenu && (
              <div
                style={{ zIndex: Z_INDEX.dropdowns }}
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 bottom-full mb-1 w-36 glass-modal rounded-xl p-1 text-xs text-[var(--text-primary)] modal-morph-enter"
              >
                <button
                  onClick={() => {
                    setShowMenu(false);
                    openDetails(item);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
                >
                  File Details
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[var(--danger-subtle)] text-[var(--danger)] transition-colors"
                >
                  Move to Trash
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
