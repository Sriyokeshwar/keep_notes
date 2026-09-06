"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export interface VaultItem {
  id: string;
  _id?: string;
  name: string;
  type: "note" | "file" | "link";
  mimeType: string;
  size: number;
  storageFileId?: string;
  storageProvider?: "google_drive" | "local";
  checksum?: string;
  thumbnailUrl?: string;
  isPinned: boolean;
  isFavorite: boolean;
  isTrash: boolean;
  tags: string[];
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  note?: {
    id: string;
    content: string;
    color: string;
    isChecklist: boolean;
    checklistItems: Array<{ id: string; text: string; checked: boolean }>;
    currentVersion: number;
    tags: string[];
  } | null;
}

export interface VaultFolder {
  id: string;
  _id?: string;
  name: string;
  color?: string;
  parentFolderId?: string | null;
  itemCount?: number;
  subfolderCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Breadcrumb {
  id: string;
  name: string;
}

export interface DuplicatePromptData {
  file: File;
  folderId: string | null;
  existingItem: {
    id: string;
    name: string;
    size: number;
    folderId: string | null;
  };
}

interface VaultContextType {
  currentFolderId: string | null;
  currentFolder: VaultFolder | null;
  breadcrumbs: Breadcrumb[];
  folders: VaultFolder[];
  items: VaultItem[];
  isLoading: boolean;
  viewMode: "grid" | "list";
  setViewMode: (mode: "grid" | "list") => void;
  filterType: "all" | "note" | "file" | "link";
  setFilterType: (type: "all" | "note" | "file" | "link") => void;
  sortBy: "created" | "name" | "size" | "modified" | "type";
  setSortBy: (sort: "created" | "name" | "size" | "modified" | "type") => void;
  sortOrder: "asc" | "desc";
  setSortOrder: (order: "asc" | "desc") => void;
  refreshData: () => Promise<void>;

  // Modals & Drawers
  activeNote: VaultItem | null;
  isNoteEditorOpen: boolean;
  openNoteEditor: (note?: VaultItem | null) => void;
  closeNoteEditor: () => void;

  previewItem: VaultItem | null;
  isPreviewOpen: boolean;
  openPreview: (item: VaultItem) => void;
  closePreview: () => void;

  detailsItem: VaultItem | null;
  isDetailsOpen: boolean;
  openDetails: (item: VaultItem) => void;
  closeDetails: () => void;

  shareResource: { type: "folder" | "item"; id: string; name: string } | null;
  isShareOpen: boolean;
  openShare: (resource: { type: "folder" | "item"; id: string; name: string }) => void;
  closeShare: () => void;

  isNewFolderOpen: boolean;
  setIsNewFolderOpen: (open: boolean) => void;

  isSaveLinkOpen: boolean;
  setIsSaveLinkOpen: (open: boolean) => void;

  duplicatePrompt: DuplicatePromptData | null;
  resolveDuplicate: (action: "keep_both" | "replace" | "shortcut" | "cancel") => void;

  // Upload handler
  uploadFiles: (files: FileList | File[]) => Promise<void>;
  uploadProgress: { [fileName: string]: number };
  isUploading: boolean;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export function VaultProvider({
  children,
  initialFolderId = null,
}: {
  children: React.ReactNode;
  initialFolderId?: string | null;
}) {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(initialFolderId);
  const [currentFolder, setCurrentFolder] = useState<VaultFolder | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const [folders, setFolders] = useState<VaultFolder[]>([]);
  const [items, setItems] = useState<VaultItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterType, setFilterType] = useState<"all" | "note" | "file" | "link">("all");
  const [sortBy, setSortBy] = useState<"created" | "name" | "size" | "modified" | "type">("created");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Modals state
  const [activeNote, setActiveNote] = useState<VaultItem | null>(null);
  const [isNoteEditorOpen, setIsNoteEditorOpen] = useState(false);

  const [previewItem, setPreviewItem] = useState<VaultItem | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const [detailsItem, setDetailsItem] = useState<VaultItem | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const [shareResource, setShareResource] = useState<{ type: "folder" | "item"; id: string; name: string } | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);

  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [isSaveLinkOpen, setIsSaveLinkOpen] = useState(false);

  const [duplicatePrompt, setDuplicatePrompt] = useState<DuplicatePromptData | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ [fileName: string]: number }>({});
  const [isUploading, setIsUploading] = useState(false);

  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/vault/")) {
      const sub = pathname.replace("/vault/", "").split("/")[0];
      if (sub && sub !== "vault") {
        setCurrentFolderId(sub);
        return;
      }
    }
    setCurrentFolderId(null);
  }, [pathname]);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch current folder details if inside folder
      if (currentFolderId) {
        const folderRes = await fetch(`/api/folders/${currentFolderId}`);
        if (folderRes.ok) {
          const folderData = await folderRes.json();
          setCurrentFolder(folderData.folder);
          setBreadcrumbs(folderData.breadcrumbs || []);
        }
      } else {
        setCurrentFolder(null);
        setBreadcrumbs([]);
      }

      // 2. Fetch subfolders
      const folderParam = currentFolderId ? `parentFolderId=${currentFolderId}` : `parentFolderId=root`;
      const foldersRes = await fetch(`/api/folders?${folderParam}`);
      if (foldersRes.ok) {
        const data = await foldersRes.json();
        setFolders(data.folders || []);
      }

      // 3. Fetch items
      const itemsUrl = new URL("/api/items", window.location.origin);
      if (currentFolderId) {
        itemsUrl.searchParams.set("folderId", currentFolderId);
      } else {
        itemsUrl.searchParams.set("folderId", "root");
      }
      if (filterType !== "all") {
        itemsUrl.searchParams.set("type", filterType);
      }
      itemsUrl.searchParams.set("sort", sortBy);
      itemsUrl.searchParams.set("order", sortOrder);

      const itemsRes = await fetch(itemsUrl.toString());
      if (itemsRes.ok) {
        const data = await itemsRes.json();
        setItems(data.items || []);
      }
    } catch (err) {
      console.error("Failed to load vault data", err);
    } finally {
      setIsLoading(false);
    }
  }, [currentFolderId, filterType, sortBy, sortOrder]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Handlers for Modals
  const openNoteEditor = (note: VaultItem | null = null) => {
    setActiveNote(note);
    setIsNoteEditorOpen(true);
  };
  const closeNoteEditor = () => {
    setActiveNote(null);
    setIsNoteEditorOpen(false);
  };

  const openPreview = (item: VaultItem) => {
    if (item.type === "note") {
      openNoteEditor(item);
    } else {
      setPreviewItem(item);
      setIsPreviewOpen(true);
    }
  };
  const closePreview = () => {
    setPreviewItem(null);
    setIsPreviewOpen(false);
  };

  const openDetails = (item: VaultItem) => {
    setDetailsItem(item);
    setIsDetailsOpen(true);
  };
  const closeDetails = () => {
    setDetailsItem(null);
    setIsDetailsOpen(false);
  };

  const openShare = (resource: { type: "folder" | "item"; id: string; name: string }) => {
    setShareResource(resource);
    setIsShareOpen(true);
  };
  const closeShare = () => {
    setShareResource(null);
    setIsShareOpen(false);
  };

  // Upload handler with duplicate detection
  const uploadSingleFile = async (
    file: File,
    targetFolderId: string | null,
    duplicateAction?: "keep_both" | "replace" | "shortcut"
  ) => {
    const formData = new FormData();
    formData.append("file", file);
    if (targetFolderId) formData.append("folderId", targetFolderId);
    if (duplicateAction) formData.append("duplicateAction", duplicateAction);

    setUploadProgress((prev) => ({ ...prev, [file.name]: 50 }));

    const res = await fetch("/api/items", {
      method: "POST",
      body: formData,
    });

    if (res.status === 409) {
      const data = await res.json();
      if (data.duplicateDetected) {
        setDuplicatePrompt({
          file,
          folderId: targetFolderId,
          existingItem: data.existingItem,
        });
        return;
      }
    }

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Upload failed");
    }

    setUploadProgress((prev) => ({ ...prev, [file.name]: 100 }));
  };

  const uploadFiles = async (files: FileList | File[]) => {
    setIsUploading(true);
    const fileList = Array.from(files);
    try {
      for (const file of fileList) {
        setUploadProgress((prev) => ({ ...prev, [file.name]: 10 }));
        await uploadSingleFile(file, currentFolderId);
      }
      await refreshData();
    } catch (err) {
      console.error("Upload error:", err);
      alert((err as Error).message);
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress({}), 2000);
    }
  };

  const resolveDuplicate = async (action: "keep_both" | "replace" | "shortcut" | "cancel") => {
    if (!duplicatePrompt) return;
    const { file, folderId } = duplicatePrompt;
    setDuplicatePrompt(null);

    if (action === "cancel") return;

    try {
      setIsUploading(true);
      await uploadSingleFile(file, folderId, action);
      await refreshData();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <VaultContext.Provider
      value={{
        currentFolderId,
        currentFolder,
        breadcrumbs,
        folders,
        items,
        isLoading,
        viewMode,
        setViewMode,
        filterType,
        setFilterType,
        sortBy,
        setSortBy,
        sortOrder,
        setSortOrder,
        refreshData,

        activeNote,
        isNoteEditorOpen,
        openNoteEditor,
        closeNoteEditor,

        previewItem,
        isPreviewOpen,
        openPreview,
        closePreview,

        detailsItem,
        isDetailsOpen,
        openDetails,
        closeDetails,

        shareResource,
        isShareOpen,
        openShare,
        closeShare,

        isNewFolderOpen,
        setIsNewFolderOpen,

        isSaveLinkOpen,
        setIsSaveLinkOpen,

        duplicatePrompt,
        resolveDuplicate,

        uploadFiles,
        uploadProgress,
        isUploading,
      }}
    >
      {children}
    </VaultContext.Provider>
  );
}

export function useVault() {
  const context = useContext(VaultContext);
  if (!context) {
    throw new Error("useVault must be used within a VaultProvider");
  }
  return context;
}
