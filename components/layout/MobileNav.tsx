"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useVault } from "@/components/providers/VaultContext";
import { Z_INDEX } from "@/lib/tokens/zIndex";
import {
  Folder,
  Star,
  Clock,
  Search,
  Plus,
  StickyNote,
  FolderPlus,
  Upload,
  Link as LinkIcon,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  onOpenSearch: () => void;
}

export function MobileNav({ onOpenSearch }: MobileNavProps) {
  const pathname = usePathname();
  const { openNoteEditor, setIsNewFolderOpen, setIsSaveLinkOpen } = useVault();
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);

  const navItems = [
    { name: "Vault", href: "/vault", icon: Folder },
    { name: "Favorites", href: "/favorites", icon: Star },
    { name: "Recent", href: "/recent", icon: Clock },
  ];

  return (
    <>
      {/* Mobile Action Sheet Modal */}
      {isActionSheetOpen && (
        <div
          style={{ zIndex: Z_INDEX.drawers }}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs md:hidden flex items-end"
          onClick={() => setIsActionSheetOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-[var(--surface-elevated)] border-t border-[var(--border)] rounded-t-3xl p-5 space-y-4 shadow-2xl modal-morph-enter"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
              <h3 className="font-semibold text-sm text-[var(--text-primary)]">Quick Create</h3>
              <button
                onClick={() => setIsActionSheetOpen(false)}
                className="p-1 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => {
                  setIsActionSheetOpen(false);
                  openNoteEditor();
                }}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-[var(--surface-ground)] border border-[var(--border)] active:scale-95 transition-all text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] flex items-center justify-center flex-shrink-0">
                  <StickyNote className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-medium text-xs block text-[var(--text-primary)]">New Note</span>
                  <span className="text-[10px] text-[var(--text-muted)]">Keep-style card</span>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsActionSheetOpen(false);
                  setIsNewFolderOpen(true);
                }}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-[var(--surface-ground)] border border-[var(--border)] active:scale-95 transition-all text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-medium text-xs block text-[var(--text-primary)]">New Folder</span>
                  <span className="text-[10px] text-[var(--text-muted)]">Organize space</span>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsActionSheetOpen(false);
                  setIsSaveLinkOpen(true);
                }}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-[var(--surface-ground)] border border-[var(--border)] active:scale-95 transition-all text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-violet-500/10 text-violet-500 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                  <LinkIcon className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-medium text-xs block text-[var(--text-primary)]">Save Link</span>
                  <span className="text-[10px] text-[var(--text-muted)]">Web bookmark</span>
                </div>
              </button>

              <label className="flex items-center gap-3 p-3.5 rounded-2xl bg-[var(--surface-ground)] border border-[var(--border)] active:scale-95 transition-all cursor-pointer">
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    setIsActionSheetOpen(false);
                    // trigger file upload
                  }}
                />
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-medium text-xs block text-[var(--text-primary)]">Upload File</span>
                  <span className="text-[10px] text-[var(--text-muted)]">PDF, media, docs</span>
                </div>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Navigation Bar for Mobile */}
      <nav
        style={{ zIndex: Z_INDEX.stickyChrome }}
        className="fixed bottom-3 inset-x-3 md:hidden glass-floating rounded-2xl px-3 py-2 flex items-center justify-around shadow-xl border border-[var(--glass-border)]"
      >
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href === "/vault" && pathname.startsWith("/vault"));
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center p-1.5 rounded-xl transition-all",
                isActive
                  ? "text-[var(--accent)] font-semibold"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] mt-0.5">{item.name}</span>
            </Link>
          );
        })}

        {/* Central Floating Quick Create Button */}
        <button
          onClick={() => setIsActionSheetOpen(true)}
          aria-label="Create new item"
          className="w-11 h-11 rounded-full bg-[var(--accent)] text-[var(--accent-fg)] flex items-center justify-center shadow-lg active:scale-90 transition-transform -mt-5 border-2 border-[var(--surface-primary)]"
        >
          <Plus className="w-6 h-6" />
        </button>

        {/* Search / Command Trigger */}
        <button
          onClick={onOpenSearch}
          className="flex flex-col items-center justify-center p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
        >
          <Search className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Search</span>
        </button>
      </nav>
    </>
  );
}
