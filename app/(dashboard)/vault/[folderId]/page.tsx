"use client";

import React from "react";
import { useVault } from "@/components/providers/VaultContext";
import { FolderGrid } from "@/components/workspace/FolderGrid";
import { FolderList } from "@/components/workspace/FolderList";

export default function NestedFolderPage() {
  const { viewMode, currentFolder } = useVault();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            {currentFolder?.name || "Folder"}
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Organize notes, files, and bookmarks inside this workspace.
          </p>
        </div>
      </div>

      {viewMode === "grid" ? <FolderGrid /> : <FolderList />}
    </div>
  );
}
