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

  const getFileIcon = (item: VaultItem) => {
    const vType = getViewerType(item.mimeType, item.name);
    switch (vType) {
      case "image":
        return <ImageIcon className="w-5 h-5 text-emerald-500" />;
      case "video":
        return <Film className="w-5 h-5 text-violet-500" />;
      case "audio":
        return <Music className="w-5 h-5 text-amber-500" />;
      case "pdf":
        return <FileText className="w-5 h-5 text-rose-500" />;
      case "office":
        return <FileSpreadsheet className="w-5 h-5 text-blue-500" />;
      default:
        return <FileText className="w-5 h-5 text-neutral-500" />;
    }
  };

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

  const handleDeleteItem = async (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    try {
      await fetch(`/api/items/${itemId}`, { method: "DELETE" });
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
      <div className="flex items-center justify-center h-64 text-xs text-neutral-400">
        Loading vault items...
      </div>
    );
  }

  const hasContent = folders.length > 0 || items.length > 0;

  if (!hasContent) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-[var(--accent-subtle)] border border-[var(--accent-subtle-border)] text-[var(--accent)] flex items-center justify-center shadow-xs">
          <UploadCloud className="w-7 h-7" />
        </div>
        <div>
          <h3 className="font-semibold text-base text-[var(--text-primary)] mb-1">
            This folder is empty
          </h3>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Drag and drop files directly onto this workspace, or use the shortcuts below to get started.
          </p>
        </div>
        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={() => openNoteEditor()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] rounded-xl text-xs font-medium shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Note</span>
          </button>
          <button
            onClick={() => setIsNewFolderOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[var(--surface-primary)] border border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] rounded-xl text-xs font-medium transition-colors"
          >
            <Folder className="w-3.5 h-3.5" />
            <span>New Folder</span>
          </button>
          <button
            onClick={() => setIsSaveLinkOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[var(--surface-primary)] border border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] rounded-xl text-xs font-medium transition-colors"
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Save Link</span>
          </button>
        </div>
      </div>
    );
  }

  // Separate pinned items and unpinned items
  const pinnedItems = items.filter((i) => i.isPinned);
  const regularItems = items.filter((i) => !i.isPinned);

  return (
    <div className="space-y-8 select-none folder-enter-forward">
      {/* 1. Folders Section */}
      {folders.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-[var(--text-muted)]">
            Folders ({folders.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {folders.map((folder) => (
              <div
                key={folder.id}
                onDoubleClick={() => router.push(`/vault/${folder.id}`)}
                className="group relative flex items-center justify-between p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-primary)] hover:border-[var(--accent)] hover:shadow-[var(--shadow-card-hover)] transition-all cursor-pointer"
              >
                <Link
                  href={`/vault/${folder.id}`}
                  className="flex items-center gap-2.5 min-w-0 flex-1"
                >
                  <Folder
                    className="w-5 h-5 flex-shrink-0"
                    style={{ color: folder.color || "var(--accent)" }}
                  />
                  <div className="min-w-0">
                    <span className="font-medium text-xs truncate block text-[var(--text-primary)]">
                      {folder.name}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {folder.itemCount || 0} items
                    </span>
                  </div>
                </Link>

                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuId(activeMenuId === folder.id ? null : folder.id);
                    }}
                    className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>

                  {activeMenuId === folder.id && (
                    <div
                      style={{ zIndex: Z_INDEX.dropdowns }}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-full mt-1 w-36 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-xl shadow-[var(--shadow-popover)] p-1 text-xs text-[var(--text-primary)]"
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
          <h3 className="text-xs font-medium text-[var(--text-muted)]">
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
            <h3 className="text-xs font-medium text-[var(--text-muted)]">
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

// Sub-component for Files & Links cards
function ItemCard({ item }: { item: VaultItem }) {
  const { openPreview, openShare, openDetails, refreshData } = useVault();
  const [showMenu, setShowMenu] = useState(false);

  const isLink = item.type === "link";
  const isImage = item.mimeType.startsWith("image/");
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
      className="group relative rounded-xl border border-[var(--border)] bg-[var(--surface-primary)] p-3 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-card-hover)] transition-all duration-200 flex flex-col justify-between cursor-pointer overflow-hidden select-none"
    >
      {/* Top Preview Area */}
      <div className="relative w-full h-32 rounded-lg bg-[var(--surface-ground)] border border-[var(--border-subtle)] flex items-center justify-center overflow-hidden mb-3">
        {isImage && item.storageFileId ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={downloadUrl}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-200"
          />
        ) : isLink ? (
          item.metadata?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.metadata.image}
              alt={item.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-1 text-sky-600 dark:text-sky-400">
              <LinkIcon className="w-8 h-8" />
              <span className="text-[10px] font-mono text-[var(--text-muted)]">
                {item.metadata?.domain || "Link"}
              </span>
            </div>
          )
        ) : (
          <div className="w-11 h-11 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] shadow-xs flex items-center justify-center text-[var(--accent)]">
            {item.mimeType.startsWith("video/") ? (
              <Film className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            ) : item.mimeType.startsWith("audio/") ? (
              <Music className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            ) : item.mimeType === "application/pdf" ? (
              <FileText className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            ) : (
              <FileText className="w-5 h-5 text-[var(--accent)]" />
            )}
          </div>
        )}

        {/* Favorite Star badge top right */}
        <button
          onClick={handleFavoriteToggle}
          title={item.isFavorite ? "Remove favorite" : "Add to favorites"}
          className={cn(
            "absolute top-2 right-2 p-1 rounded-md bg-[var(--surface-primary)]/90 backdrop-blur-xs border border-[var(--border-subtle)] transition opacity-0 group-hover:opacity-100",
            item.isFavorite && "opacity-100 text-amber-600"
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
          <h4 className="font-medium text-xs text-[var(--text-primary)] truncate flex-1">
            {item.name}
          </h4>
        </div>
        <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] font-mono">
          <span>{isLink ? item.metadata?.domain : formatBytes(item.size)}</span>
          <span>{formatDate(item.createdAt).split(",")[0]}</span>
        </div>
      </div>

      {/* Hover Action Bar */}
      <div className="pt-2 mt-2 border-t border-[var(--border-subtle)] flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
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
                className="absolute right-0 bottom-full mb-1 w-36 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-xl shadow-[var(--shadow-popover)] p-1 text-xs text-[var(--text-primary)]"
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
