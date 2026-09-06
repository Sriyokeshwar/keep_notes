"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { MobileNav } from "@/components/layout/MobileNav";
import { CommandPalette } from "@/components/search/CommandPalette";
import { DropZone } from "@/components/upload/DropZone";
import { NoteEditorModal } from "@/components/notes/NoteEditorModal";
import { UniversalViewer } from "@/components/viewers/UniversalViewer";
import { ItemDetailsDrawer } from "@/components/workspace/ItemDetailsDrawer";
import { ShareModal } from "@/components/sharing/ShareModal";
import { NewFolderModal } from "@/components/workspace/NewFolderModal";
import { SaveLinkModal } from "@/components/workspace/SaveLinkModal";
import { DuplicateModal } from "@/components/upload/DuplicateModal";
import { UploadProgressToast } from "@/components/upload/UploadProgressToast";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Global Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <DropZone>
      <div className="flex h-screen w-screen overflow-hidden bg-[var(--surface-ground)] text-[var(--text-primary)] font-sans spatial-ambient-bg">
        {/* Left Sidebar (Desktop / Tablet / Mobile Drawer) */}
        <Sidebar
          isMobileOpen={isMobileSidebarOpen}
          onMobileClose={() => setIsMobileSidebarOpen(false)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Main Workspace Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          <Topbar
            onOpenSearch={() => setIsCommandPaletteOpen(true)}
            onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          />

          <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 pb-24 md:pb-8">
            {children}
          </main>

          {/* Floating Mobile Bottom Navigation */}
          <MobileNav onOpenSearch={() => setIsCommandPaletteOpen(true)} />
        </div>
      </div>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />

      {/* Global Modals & Drawers */}
      <NoteEditorModal />
      <UniversalViewer />
      <ItemDetailsDrawer />
      <ShareModal />
      <NewFolderModal />
      <SaveLinkModal />
      <DuplicateModal />
      <UploadProgressToast />
    </DropZone>
  );
}
