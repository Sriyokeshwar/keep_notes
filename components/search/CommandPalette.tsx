"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useVault, VaultItem } from "@/components/providers/VaultContext";
import { useTheme } from "@/components/providers/ThemeProvider";
import { Z_INDEX } from "@/lib/tokens/zIndex";
import {
  Search,
  StickyNote,
  FolderPlus,
  Upload,
  Sun,
  Moon,
  Star,
  Trash2,
  Clock,
  Folder,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  Link as LinkIcon,
  CornerDownLeft,
  X,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavigableItem {
  id: string;
  title: string;
  category: string;
  subtitle?: string;
  shortcut?: string;
  icon: any;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const {
    openNoteEditor,
    openPreview,
    setIsNewFolderOpen,
    setIsSaveLinkOpen,
    uploadFiles,
  } = useVault();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<"all" | "notes" | "files" | "links" | "actions">("all");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchResults, setSearchResults] = useState<{ folders: any[]; items: VaultItem[] } | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Quick system actions
  const defaultActions: NavigableItem[] = useMemo(() => [
    {
      id: "action-new-note",
      title: "Create New Note",
      category: "actions",
      shortcut: "N",
      icon: StickyNote,
      action: () => {
        onClose();
        openNoteEditor();
      },
    },
    {
      id: "action-new-folder",
      title: "Create New Folder",
      category: "actions",
      shortcut: "F",
      icon: FolderPlus,
      action: () => {
        onClose();
        setIsNewFolderOpen(true);
      },
    },
    {
      id: "action-upload",
      title: "Upload Files",
      category: "actions",
      shortcut: "U",
      icon: Upload,
      action: () => {
        onClose();
        fileInputRef.current?.click();
      },
    },
    {
      id: "action-save-link",
      title: "Bookmark Link",
      category: "actions",
      shortcut: "L",
      icon: LinkIcon,
      action: () => {
        onClose();
        setIsSaveLinkOpen(true);
      },
    },
    {
      id: "action-toggle-theme",
      title: resolvedTheme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode",
      category: "actions",
      shortcut: "T",
      icon: resolvedTheme === "dark" ? Sun : Moon,
      action: () => {
        setTheme(resolvedTheme === "dark" ? "light" : "dark");
        onClose();
      },
    },
    {
      id: "action-goto-favorites",
      title: "Open Favorites",
      category: "actions",
      shortcut: "G F",
      icon: Star,
      action: () => {
        onClose();
        router.push("/favorites");
      },
    },
    {
      id: "action-goto-trash",
      title: "Open Trash",
      category: "actions",
      shortcut: "G T",
      icon: Trash2,
      action: () => {
        onClose();
        router.push("/trash");
      },
    },
  ], [onClose, openNoteEditor, setIsNewFolderOpen, setIsSaveLinkOpen, resolvedTheme, setTheme, router]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (err) {
        console.error("Command palette search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [query]);

  // Combine items into flat navigable list
  const navigableItems: NavigableItem[] = useMemo(() => {
    if (!query.trim()) {
      return defaultActions;
    }

    const items: NavigableItem[] = [];

    // Add matching actions
    defaultActions
      .filter((a) => a.title.toLowerCase().includes(query.toLowerCase()))
      .forEach((a) => items.push(a));

    if (searchResults) {
      // Add Folders
      if (activeCategory === "all") {
        searchResults.folders.forEach((f) => {
          items.push({
            id: `folder-${f.id || f._id}`,
            title: f.name,
            category: "folders",
            subtitle: "Folder",
            icon: Folder,
            action: () => {
              onClose();
              router.push(`/vault/${f.id || f._id}`);
            },
          });
        });
      }

      // Add Items
      searchResults.items.forEach((item) => {
        if (activeCategory === "notes" && item.type !== "note") return;
        if (activeCategory === "files" && item.type !== "file") return;
        if (activeCategory === "links" && item.type !== "link") return;

        let Icon = FileText;
        if (item.type === "note") Icon = StickyNote;
        else if (item.type === "link") Icon = LinkIcon;
        else if (item.mimeType.startsWith("image/")) Icon = ImageIcon;
        else if (item.mimeType.startsWith("video/")) Icon = Film;
        else if (item.mimeType.startsWith("audio/")) Icon = Music;

        items.push({
          id: `item-${item.id}`,
          title: item.name,
          category: item.type,
          subtitle: item.type === "note" ? item.note?.content?.slice(0, 40) : item.mimeType,
          icon: Icon,
          action: () => {
            onClose();
            if (item.type === "note") {
              openNoteEditor(item);
            } else if (item.type === "link" && item.metadata?.url) {
              window.open(item.metadata.url, "_blank");
            } else {
              openPreview(item);
            }
          },
        });
      });
    }

    return items;
  }, [query, defaultActions, searchResults, activeCategory, onClose, router, openNoteEditor, openPreview]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (navigableItems.length || 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + navigableItems.length) % (navigableItems.length || 1));
      } else if (e.key === "Enter" && navigableItems[selectedIndex]) {
        e.preventDefault();
        navigableItems[selectedIndex].action();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, navigableItems, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{ zIndex: Z_INDEX.modals }}
      className="fixed inset-0 flex items-start justify-center pt-20 px-4 bg-black/50 backdrop-blur-xs select-none"
      onClick={onClose}
    >
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        multiple
        onChange={(e) => {
          if (e.target.files) uploadFiles(Array.from(e.target.files));
        }}
      />

      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-2xl glass-floating overflow-hidden modal-morph-enter flex flex-col max-h-[75vh]"
      >
        {/* Search Header Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-[var(--border)] gap-3">
          <Search className="w-5 h-5 text-[var(--accent)] flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search notes, files, actions... (or press Esc to exit)"
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-hidden"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-[var(--surface-active)] text-[var(--text-muted)] border border-[var(--border)]">
            ESC
          </span>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center px-4 py-2 border-b border-[var(--border-subtle)] gap-1.5 overflow-x-auto text-xs">
          {(
            [
              { id: "all", label: "All" },
              { id: "notes", label: "Notes" },
              { id: "files", label: "Files" },
              { id: "links", label: "Links" },
              { id: "actions", label: "Actions" },
            ] as const
          ).map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors",
                activeCategory === cat.id
                  ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                  : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
              )}
            >
              {cat.label}
            </button>
          ))}
          {isSearching && (
            <div className="ml-auto text-[11px] text-[var(--accent)] animate-pulse flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>Searching...</span>
            </div>
          )}
        </div>

        {/* Results / Actions List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {navigableItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-[var(--text-muted)]">
              No results found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            navigableItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={cn(
                    "flex items-center justify-between px-3 py-2.5 rounded-xl text-xs cursor-pointer transition-all",
                    isSelected
                      ? "bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent-subtle-border)]"
                      : "text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border border-transparent"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
                        isSelected
                          ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                          : "bg-[var(--surface-ground)] text-[var(--text-muted)]"
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-medium truncate block">{item.title}</span>
                      {item.subtitle && (
                        <span className="text-[10px] text-[var(--text-muted)] truncate block">
                          {item.subtitle}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    {"shortcut" in item && item.shortcut ? (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-[var(--surface-ground)] text-[var(--text-muted)] border border-[var(--border)]">
                        {item.shortcut}
                      </span>
                    ) : null}
                    {isSelected && (
                      <CornerDownLeft className="w-3.5 h-3.5 text-[var(--accent)]" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-[var(--surface-ground)] border-t border-[var(--border)] text-[10px] text-[var(--text-muted)]">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="font-mono bg-[var(--surface-elevated)] px-1 py-0.5 rounded border border-[var(--border)]">↑</kbd>{" "}
              <kbd className="font-mono bg-[var(--surface-elevated)] px-1 py-0.5 rounded border border-[var(--border)]">↓</kbd> Navigate
            </span>
            <span>
              <kbd className="font-mono bg-[var(--surface-elevated)] px-1 py-0.5 rounded border border-[var(--border)]">↵</kbd> Select
            </span>
          </div>
          <span className="font-medium">Knowledge Vault Command</span>
        </div>
      </div>
    </div>
  );
}
