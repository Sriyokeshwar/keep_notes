"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useVault } from "@/components/providers/VaultContext";
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
  ChevronRight,
  Sun,
  Moon,
  Laptop,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TopbarProps {
  onOpenSearch?: () => void;
  onOpenMobileMenu?: () => void;
}

export function Topbar({ onOpenSearch, onOpenMobileMenu }: TopbarProps) {
  const {
    breadcrumbs,
    currentFolder,
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    openNoteEditor,
    setIsNewFolderOpen,
    setIsSaveLinkOpen,
    uploadFiles,
  } = useVault();

  const { theme, setTheme } = useTheme();

  // Create menu popover state
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const createMenuRef = useRef<HTMLDivElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (createMenuRef.current && !createMenuRef.current.contains(e.target as Node)) {
        setIsCreateMenuOpen(false);
      }
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setIsSortMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="h-16 px-4 md:px-6 border-b border-[var(--border)] glass-panel flex items-center justify-between gap-4 sticky top-0 select-none z-10 transition-colors">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        multiple
        onChange={(e) => {
          if (e.target.files) {
            uploadFiles(Array.from(e.target.files));
          }
        }}
      />

      {/* Left: Mobile Menu Trigger + Breadcrumbs */}
      <div className="flex items-center gap-2 min-w-0 flex-1 sm:flex-initial">
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            aria-label="Open navigation menu"
            className="md:hidden p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors flex-shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <nav aria-label="Breadcrumbs" className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] overflow-hidden">
          <Link
            href="/vault"
            className="hover:text-[var(--text-primary)] transition-colors whitespace-nowrap"
          >
            Vault
          </Link>
          {breadcrumbs.map((b) => (
            <React.Fragment key={b.id}>
              <ChevronRight className="w-3.5 h-3.5 text-[var(--text-faint)] flex-shrink-0" />
              <Link
                href={`/vault/${b.id}`}
                className={cn(
                  "truncate max-w-[120px] transition-colors",
                  b.id === currentFolder?.id
                    ? "text-[var(--text-primary)] font-semibold"
                    : "hover:text-[var(--text-primary)]"
                )}
              >
                {b.name}
              </Link>
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* Center: Global Command Palette Pill */}
      <div className="flex-1 max-w-md hidden sm:flex justify-center">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-[var(--surface-ground)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs text-[var(--text-muted)] transition-all shadow-2xs group"
        >
          <Search className="w-4 h-4 text-[var(--text-faint)] group-hover:text-[var(--accent)] transition-colors flex-shrink-0" />
          <span className="flex-1 text-left truncate">Search notes, files, actions...</span>
          <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-primary)] border border-[var(--border)] text-[var(--text-muted)] flex-shrink-0">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Actions, Sort, View, Theme */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Mobile Search Icon button */}
        {onOpenSearch && (
          <button
            onClick={onOpenSearch}
            className="sm:hidden p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
          >
            <Search className="w-4 h-4" />
          </button>
        )}

        {/* Create + Menu */}
        <div className="relative" ref={createMenuRef}>
          <button
            onClick={() => setIsCreateMenuOpen(!isCreateMenuOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] rounded-xl text-xs font-medium shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New</span>
          </button>

          {isCreateMenuOpen && (
            <div
              style={{ zIndex: Z_INDEX.dropdowns }}
              className="absolute right-0 top-full mt-1.5 w-44 rounded-xl glass-modal p-1.5 text-xs text-[var(--text-primary)] modal-morph-enter"
            >
              <button
                onClick={() => {
                  setIsCreateMenuOpen(false);
                  openNoteEditor();
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-[var(--surface-hover)] text-left transition-colors"
              >
                <StickyNote className="w-4 h-4 text-[var(--accent)]" />
                <span>New Note</span>
              </button>

              <button
                onClick={() => {
                  setIsCreateMenuOpen(false);
                  setIsNewFolderOpen(true);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-[var(--surface-hover)] text-left transition-colors"
              >
                <FolderPlus className="w-4 h-4 text-blue-500" />
                <span>New Folder</span>
              </button>

              <button
                onClick={() => {
                  setIsCreateMenuOpen(false);
                  fileInputRef.current?.click();
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-[var(--surface-hover)] text-left transition-colors"
              >
                <Upload className="w-4 h-4 text-emerald-500" />
                <span>Upload Files</span>
              </button>

              <button
                onClick={() => {
                  setIsCreateMenuOpen(false);
                  setIsSaveLinkOpen(true);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-[var(--surface-hover)] text-left transition-colors"
              >
                <LinkIcon className="w-4 h-4 text-violet-500" />
                <span>Bookmark Link</span>
              </button>
            </div>
          )}
        </div>

        {/* Sort Menu */}
        <div className="relative hidden md:block" ref={sortMenuRef}>
          <button
            onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors border border-transparent hover:border-[var(--border)]"
            title="Sort options"
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>

          {isSortMenuOpen && (
            <div
              style={{ zIndex: Z_INDEX.dropdowns }}
              className="absolute right-0 top-full mt-1.5 w-40 rounded-xl glass-modal p-1.5 text-xs text-[var(--text-primary)] modal-morph-enter"
            >
              {[
                { label: "Name", val: "name" },
                { label: "Date Created", val: "created" },
                { label: "Date Modified", val: "modified" },
                { label: "Size", val: "size" },
              ].map((s) => (
                <button
                  key={s.val}
                  onClick={() => {
                    if (sortBy === s.val) {
                      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                    } else {
                      setSortBy(s.val as any);
                    }
                    setIsSortMenuOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors",
                    sortBy === s.val
                      ? "bg-[var(--accent-subtle)] text-[var(--accent)] font-semibold"
                      : "hover:bg-[var(--surface-hover)]"
                  )}
                >
                  <span>{s.label}</span>
                  {sortBy === s.val && (
                    <span className="text-[10px] text-[var(--accent)]">
                      {sortOrder === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="hidden sm:flex items-center bg-[var(--surface-ground)] border border-[var(--border)] rounded-xl p-0.5">
          <button
            onClick={() => setViewMode("grid")}
            aria-label="Grid view"
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              viewMode === "grid"
                ? "bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-2xs"
                : "text-[var(--text-faint)] hover:text-[var(--text-primary)]"
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            aria-label="List view"
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              viewMode === "list"
                ? "bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-2xs"
                : "text-[var(--text-faint)] hover:text-[var(--text-primary)]"
            )}
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Theme Selector (Sun / Moon / Laptop) */}
        <div className="flex items-center bg-[var(--surface-ground)] border border-[var(--border)] rounded-xl p-0.5">
          <button
            onClick={() => setTheme("light")}
            aria-label="Light mode"
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              theme === "light"
                ? "bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-2xs"
                : "text-[var(--text-faint)] hover:text-[var(--text-primary)]"
            )}
          >
            <Sun className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setTheme("dark")}
            aria-label="Dark mode"
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              theme === "dark"
                ? "bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-2xs"
                : "text-[var(--text-faint)] hover:text-[var(--text-primary)]"
            )}
          >
            <Moon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setTheme("system")}
            aria-label="System mode"
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              theme === "system"
                ? "bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-2xs"
                : "text-[var(--text-faint)] hover:text-[var(--text-primary)]"
            )}
          >
            <Laptop className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
