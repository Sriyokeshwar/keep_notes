"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useVault, VaultItem } from "@/components/providers/VaultContext";
import { useTheme } from "@/components/providers/ThemeProvider";
import { Z_INDEX } from "@/lib/tokens/zIndex";
import {
  Search,
  Plus,
  LayoutGrid,
  List,
  FolderPlus,
  StickyNote,
  Link as LinkIcon,
  Upload,
  ArrowUpDown,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  ChevronRight,
  ExternalLink,
  X,
  Sun,
  Moon,
  Laptop,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Topbar() {
  const {
    breadcrumbs,
    currentFolder,
    viewMode,
    setViewMode,
    filterType,
    setFilterType,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    openNoteEditor,
    openPreview,
    setIsNewFolderOpen,
    setIsSaveLinkOpen,
    uploadFiles,
  } = useVault();

  const { theme, setTheme } = useTheme();

  // Create menu popover state
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const createMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Global search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ folders: any[]; items: VaultItem[] } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close create menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (createMenuRef.current && !createMenuRef.current.contains(e.target as Node)) {
        setIsCreateMenuOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchResults(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files);
      e.target.value = "";
    }
  };

  return (
    <header
      style={{ zIndex: Z_INDEX.stickyChrome }}
      className="h-16 border-b border-[var(--border)] bg-[var(--surface-primary)] px-6 flex items-center justify-between gap-4 sticky top-0 transition-colors duration-150"
    >
      {/* Left: Breadcrumbs navigation */}
      <div className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] min-w-0 flex-shrink">
        <Link
          href="/vault"
          className="hover:text-[var(--text-primary)] font-medium transition-colors"
        >
          Home
        </Link>
        {breadcrumbs.map((b, idx) => (
          <React.Fragment key={b.id}>
            <ChevronRight className="w-3.5 h-3.5 text-[var(--text-faint)] flex-shrink-0" />
            <Link
              href={`/vault/${b.id}`}
              className={cn(
                "truncate max-w-[140px] hover:text-[var(--text-primary)] transition-colors",
                idx === breadcrumbs.length - 1
                  ? "font-semibold text-[var(--text-primary)]"
                  : ""
              )}
            >
              {b.name}
            </Link>
          </React.Fragment>
        ))}
      </div>

      {/* Center: Global Search Bar */}
      <div ref={searchRef} className="relative flex-1 max-w-md">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files, notes, tags..."
            className="w-full pl-9 pr-8 py-1.5 bg-[var(--surface-ground)] border border-[var(--border)] rounded-full text-xs text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSearchResults(null);
              }}
              className="absolute right-2.5 p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {searchResults && (
          <div
            style={{ zIndex: Z_INDEX.dropdowns }}
            className="absolute left-0 right-0 top-full mt-2 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-xl shadow-[var(--shadow-popover)] p-2 max-h-96 overflow-y-auto"
          >
            {isSearching ? (
              <div className="p-4 text-center text-xs text-[var(--text-muted)]">
                Searching vault...
              </div>
            ) : searchResults.folders.length === 0 && searchResults.items.length === 0 ? (
              <div className="p-4 text-center text-xs text-[var(--text-muted)]">
                No results found for &ldquo;{searchQuery}&rdquo;
              </div>
            ) : (
              <>
                {searchResults.folders.length > 0 && (
                  <div className="mb-2">
                    <div className="px-2 py-1 text-[11px] font-medium text-[var(--text-muted)]">
                      Folders
                    </div>
                    {searchResults.folders.map((f) => (
                      <Link
                        key={f._id}
                        href={`/vault/${f._id}`}
                        onClick={() => setSearchResults(null)}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs hover:bg-[var(--surface-hover)] text-[var(--text-primary)] transition"
                      >
                        <FolderPlus className="w-3.5 h-3.5 text-[var(--accent)]" />
                        <span className="font-medium truncate">{f.name}</span>
                      </Link>
                    ))}
                  </div>
                )}

                {searchResults.items.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-[11px] font-medium text-[var(--text-muted)]">
                      Files & Notes
                    </div>
                    {searchResults.items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setSearchResults(null);
                          if (item.type === "note") openNoteEditor(item);
                          else openPreview(item);
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs hover:bg-[var(--surface-hover)] text-[var(--text-primary)] transition text-left"
                      >
                        <div className="flex items-center gap-2 truncate">
                          {item.type === "note" ? (
                            <StickyNote className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          ) : (
                            <FileText className="w-3.5 h-3.5 text-[var(--accent)]" />
                          )}
                          <span className="truncate">{item.name}</span>
                        </div>
                        <span className="text-[10px] text-[var(--text-muted)] capitalize">{item.type}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Right: Actions, Filters, Theme toggle & Create button */}
      <div className="flex items-center gap-2">
        {/* Filter Type Pills */}
        <div className="hidden lg:flex items-center bg-[var(--surface-ground)] border border-[var(--border-subtle)] p-0.5 rounded-lg text-xs">
          {(["all", "note", "file", "link"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={cn(
                "px-2.5 py-1 rounded-md capitalize font-medium transition-all",
                filterType === t
                  ? "bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              {t === "all" ? "All" : t === "note" ? "Notes" : t === "file" ? "Files" : "Links"}
            </button>
          ))}
        </div>

        {/* Sort Select */}
        <div className="flex items-center border border-[var(--border)] bg-[var(--surface-primary)] rounded-lg px-2 py-1 text-xs gap-1">
          <ArrowUpDown className="w-3 h-3 text-[var(--text-muted)]" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-transparent text-[var(--text-primary)] focus:outline-none cursor-pointer"
          >
            <option value="created">Created</option>
            <option value="modified">Modified</option>
            <option value="name">Name</option>
            <option value="size">Size</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="text-[10px] font-mono px-1 hover:text-[var(--accent)] transition"
          >
            {sortOrder === "asc" ? "▲" : "▼"}
          </button>
        </div>

        {/* View mode toggle (Grid / List) */}
        <div className="flex items-center border border-[var(--border)] bg-[var(--surface-primary)] rounded-lg p-0.5">
          <button
            onClick={() => setViewMode("grid")}
            title="Grid view"
            className={cn(
              "p-1 rounded-md transition",
              viewMode === "grid"
                ? "bg-[var(--surface-hover)] text-[var(--text-primary)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            title="List view"
            className={cn(
              "p-1 rounded-md transition",
              viewMode === "list"
                ? "bg-[var(--surface-hover)] text-[var(--text-primary)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Theme Switcher Toggle (Light / Dark / System) */}
        <div className="flex items-center border border-[var(--border)] bg-[var(--surface-primary)] rounded-lg p-0.5">
          <button
            onClick={() => {
              if (theme === "system") setTheme("light");
              else if (theme === "light") setTheme("dark");
              else setTheme("system");
            }}
            title={`Current theme: ${theme}. Click to cycle.`}
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition flex items-center gap-1 text-xs"
          >
            {theme === "light" && <Sun className="w-3.5 h-3.5 text-amber-600" />}
            {theme === "dark" && <Moon className="w-3.5 h-3.5 text-[var(--accent)]" />}
            {theme === "system" && <Laptop className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Hidden file input for uploads */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Prominent + Create Menu */}
        <div ref={createMenuRef} className="relative">
          <button
            onClick={() => setIsCreateMenuOpen(!isCreateMenuOpen)}
            className="flex items-center gap-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] px-3 py-1.5 rounded-lg text-xs font-medium shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New</span>
          </button>

          {isCreateMenuOpen && (
            <div
              style={{ zIndex: Z_INDEX.dropdowns }}
              className="absolute right-0 top-full mt-1.5 w-48 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-xl shadow-[var(--shadow-popover)] p-1.5 space-y-0.5"
            >
              <button
                onClick={() => {
                  setIsCreateMenuOpen(false);
                  openNoteEditor();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition text-left"
              >
                <StickyNote className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>New Note</span>
              </button>
              <button
                onClick={() => {
                  setIsCreateMenuOpen(false);
                  setIsNewFolderOpen(true);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition text-left"
              >
                <FolderPlus className="w-4 h-4 text-[var(--accent)]" />
                <span>New Folder</span>
              </button>
              <button
                onClick={() => {
                  setIsCreateMenuOpen(false);
                  setIsSaveLinkOpen(true);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition text-left"
              >
                <LinkIcon className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span>Save Link</span>
              </button>
              <div className="h-px bg-[var(--border-subtle)] my-1" />
              <button
                onClick={() => {
                  setIsCreateMenuOpen(false);
                  fileInputRef.current?.click();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition text-left"
              >
                <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Upload Files</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
