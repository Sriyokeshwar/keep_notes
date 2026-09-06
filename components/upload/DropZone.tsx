"use client";

import React, { useState, useEffect } from "react";
import { UploadCloud } from "lucide-react";
import { useVault } from "@/components/providers/VaultContext";
import { Z_INDEX } from "@/lib/tokens/zIndex";

export function DropZone({ children }: { children: React.ReactNode }) {
  const { uploadFiles } = useVault();
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      setDragCounter((prev) => prev + 1);
      if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
        setIsDragging(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      setDragCounter((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          setIsDragging(false);
          return 0;
        }
        return next;
      });
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      setDragCounter(0);
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        uploadFiles(e.dataTransfer.files);
      }
    };

    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("drop", handleDrop);
    };
  }, [uploadFiles]);

  return (
    <div className="relative w-full h-full">
      {children}

      {/* Global Drag & Drop Viewport Target */}
      {isDragging && (
        <div
          style={{ zIndex: Z_INDEX.dragOverlay }}
          className="fixed inset-0 bg-[#111417]/50 dark:bg-black/75 backdrop-blur-xs flex items-center justify-center p-8 pointer-events-none transition-opacity duration-150"
        >
          <div className="border-2 border-dashed border-[var(--accent)] bg-[var(--surface-elevated)] rounded-2xl p-10 text-center text-[var(--text-primary)] max-w-md shadow-[var(--shadow-modal)] flex flex-col items-center space-y-4">
            <div className="w-14 h-14 rounded-xl bg-[var(--accent-subtle)] border border-[var(--accent-subtle-border)] flex items-center justify-center text-[var(--accent)]">
              <UploadCloud className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-[var(--text-primary)] mb-1">
                Deposit files to Vault
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Release to store in active folder. Supports notes, documents, media, and archives.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
