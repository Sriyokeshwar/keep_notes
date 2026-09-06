"use client";

import React, { useEffect, useState } from "react";
import { Z_INDEX } from "@/lib/tokens/zIndex";
import { History, RotateCcw, X, Clock, User, Check } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface VersionItem {
  id: string;
  version: number;
  content: string;
  checklistItems?: Array<{ id: string; text: string; checked: boolean }>;
  changeSummary: string;
  editedAt: string;
  editedBy?: {
    name: string;
    email: string;
    avatar?: string;
  };
}

export function NoteVersionsDrawer({
  itemId,
  isOpen,
  onClose,
  onRestored,
}: {
  itemId: string;
  isOpen: boolean;
  onClose: () => void;
  onRestored: () => void;
}) {
  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<VersionItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    if (!isOpen || !itemId) return;

    const fetchVersions = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/items/${itemId}/versions`);
        if (res.ok) {
          const data = await res.json();
          setVersions(data.versions || []);
          if (data.versions?.length) {
            setSelectedVersion(data.versions[0]);
          }
        }
      } catch (err) {
        console.error("Failed to load versions:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVersions();
  }, [isOpen, itemId]);

  const handleRestore = async (versionNum: number) => {
    if (!confirm(`Restore version ${versionNum}? This will create a new latest revision with its contents.`)) {
      return;
    }
    setIsRestoring(true);
    try {
      const res = await fetch(`/api/items/${itemId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionToRestore: versionNum }),
      });
      if (res.ok) {
        onRestored();
        onClose();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to restore version");
      }
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setIsRestoring(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{ zIndex: Z_INDEX.modalBackdrop }}
      className="fixed inset-0 flex justify-end bg-black/45 dark:bg-black/70 backdrop-blur-xs"
    >
      <div
        style={{ zIndex: Z_INDEX.drawers }}
        className="w-full max-w-xl bg-[var(--surface-elevated)] h-full shadow-[var(--shadow-modal)] flex flex-col border-l border-[var(--border)] animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[var(--accent)]" />
            <h2 className="font-semibold text-sm text-[var(--text-primary)]">Version History</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body: Timeline list on left/top, preview on right */}
        <div className="flex-1 flex overflow-hidden">
          {/* Versions List */}
          <div className="w-60 border-r border-neutral-200 dark:border-neutral-800 overflow-y-auto p-2 space-y-1">
            {isLoading ? (
              <div className="text-xs text-neutral-400 p-4 text-center">Loading versions...</div>
            ) : versions.length === 0 ? (
              <div className="text-xs text-neutral-400 p-4 text-center">No version history yet</div>
            ) : (
              versions.map((ver) => {
                const isSelected = selectedVersion?.version === ver.version;
                return (
                  <button
                    key={ver.version}
                    onClick={() => setSelectedVersion(ver)}
                    className={`w-full text-left p-2.5 rounded-xl text-xs transition ${
                      isSelected
                        ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800"
                        : "hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold mb-1">
                      <span>Version {ver.version}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                    </div>
                    <div className="text-[11px] text-neutral-500 flex items-center gap-1 mb-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(ver.editedAt)}</span>
                    </div>
                    {ver.editedBy?.name && (
                      <div className="text-[10px] text-neutral-400 truncate flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>{ver.editedBy.name}</span>
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Selected Version Preview */}
          <div className="flex-1 flex flex-col overflow-hidden bg-neutral-50/50 dark:bg-neutral-900/30">
            {selectedVersion ? (
              <div className="flex-1 flex flex-col p-4 overflow-hidden">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-200 dark:border-neutral-800">
                  <div>
                    <span className="font-semibold text-xs text-neutral-800 dark:text-neutral-200">
                      Version {selectedVersion.version}
                    </span>
                    <span className="text-[11px] text-neutral-500 ml-2">
                      ({formatDate(selectedVersion.editedAt)})
                    </span>
                  </div>
                  <button
                    disabled={isRestoring}
                    onClick={() => handleRestore(selectedVersion.version)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{isRestoring ? "Restoring..." : "Restore"}</span>
                  </button>
                </div>

                {/* Content preview */}
                <div className="flex-1 overflow-y-auto bg-white dark:bg-neutral-800 p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap font-mono leading-relaxed">
                  {selectedVersion.checklistItems && selectedVersion.checklistItems.length > 0 ? (
                    <div className="space-y-1.5">
                      {selectedVersion.checklistItems.map((chk, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input type="checkbox" checked={chk.checked} readOnly className="rounded" />
                          <span className={chk.checked ? "line-through text-neutral-400" : ""}>
                            {chk.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    selectedVersion.content || "(No content)"
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-neutral-400">
                Select a version to preview
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
