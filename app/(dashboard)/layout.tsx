import React from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { VaultProvider } from "@/components/providers/VaultContext";
import { DropZone } from "@/components/upload/DropZone";
import { NoteEditorModal } from "@/components/notes/NoteEditorModal";
import { UniversalViewer } from "@/components/viewers/UniversalViewer";
import { ItemDetailsDrawer } from "@/components/workspace/ItemDetailsDrawer";
import { ShareModal } from "@/components/sharing/ShareModal";
import { NewFolderModal } from "@/components/workspace/NewFolderModal";
import { SaveLinkModal } from "@/components/workspace/SaveLinkModal";
import { DuplicateModal } from "@/components/upload/DuplicateModal";
import { UploadProgressToast } from "@/components/upload/UploadProgressToast";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <VaultProvider>
      <DropZone>
        <div className="flex h-screen w-screen overflow-hidden bg-neutral-100/50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans">
          {/* Left Sidebar */}
          <Sidebar />

          {/* Main Area */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <Topbar />
            <main className="flex-1 overflow-y-auto p-6 md:p-8">
              {children}
            </main>
          </div>
        </div>

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
    </VaultProvider>
  );
}
