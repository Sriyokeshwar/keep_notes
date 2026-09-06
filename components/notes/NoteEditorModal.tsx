"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useVault, VaultItem } from "@/components/providers/VaultContext";
import { useTheme } from "@/components/providers/ThemeProvider";
import { ARCHIVAL_NOTE_SWATCHES, resolveNoteColors } from "@/lib/tokens/theme";
import { Z_INDEX } from "@/lib/tokens/zIndex";
import { NoteVersionsDrawer } from "./NoteVersionsDrawer";
import {
  X,
  Pin,
  CheckSquare,
  Palette,
  History,
  Download,
  Check,
  Maximize2,
  Minimize2,
  Trash2,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function NoteEditorModal() {
  const {
    activeNote,
    isNoteEditorOpen,
    closeNoteEditor,
    currentFolderId,
    refreshData,
  } = useVault();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [color, setColor] = useState("#ffffff");
  const [isChecklist, setIsChecklist] = useState(false);
  const [checklistItems, setChecklistItems] = useState<
    Array<{ id: string; text: string; checked: boolean }>
  >([]);
  const [isPinned, setIsPinned] = useState(false);

  // Autosave status: 'idle' | 'saving' | 'saved' | 'error'
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSavedTime, setLastSavedTime] = useState<string>("");
  const [isVersionsDrawerOpen, setIsVersionsDrawerOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Keep track of active item ID (for existing note or newly created note during session)
  const currentItemIdRef = useRef<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize or reset state when activeNote changes
  useEffect(() => {
    if (activeNote) {
      currentItemIdRef.current = activeNote.id;
      setTitle(activeNote.name || "");
      setIsPinned(activeNote.isPinned || false);
      const noteData = activeNote.note;
      if (noteData) {
        setContent(noteData.content || "");
        setColor(noteData.color || "#ffffff");
        setIsChecklist(Boolean(noteData.isChecklist));
        setChecklistItems(noteData.checklistItems || []);
      }
    } else {
      // Blank new note
      currentItemIdRef.current = null;
      setTitle("");
      setContent("");
      setColor("#ffffff");
      setIsChecklist(false);
      setChecklistItems([]);
      setIsPinned(false);
    }
    setSaveStatus("idle");
  }, [activeNote, isNoteEditorOpen]);

  // Core save function
  const performSave = useCallback(
    async (opts?: { createRevision?: boolean; changeSummary?: string }) => {
      // Don't save empty notes if not created yet
      if (!currentItemIdRef.current && !title.trim() && !content.trim() && checklistItems.length === 0) {
        return;
      }

      setSaveStatus("saving");
      try {
        if (!currentItemIdRef.current) {
          // POST /api/notes
          const res = await fetch("/api/notes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: title.trim() || "Untitled Note",
              folderId: currentFolderId,
              content,
              color,
              isChecklist,
              checklistItems,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            currentItemIdRef.current = data.item.id;
            setSaveStatus("saved");
            setLastSavedTime(new Date().toLocaleTimeString());
            refreshData();
          } else {
            setSaveStatus("error");
          }
        } else {
          // PUT /api/notes
          const res = await fetch("/api/notes", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              itemId: currentItemIdRef.current,
              title: title.trim() || "Untitled Note",
              content,
              color,
              isChecklist,
              checklistItems,
              createRevision: opts?.createRevision ?? false,
              changeSummary: opts?.changeSummary,
            }),
          });
          if (res.ok) {
            setSaveStatus("saved");
            setLastSavedTime(new Date().toLocaleTimeString());
            refreshData();
          } else {
            setSaveStatus("error");
          }
        }
      } catch (err) {
        console.error("Autosave error:", err);
        setSaveStatus("error");
      }
    },
    [title, content, color, isChecklist, checklistItems, currentFolderId, refreshData]
  );

  // Debounced autosave (§4: "save to Drive/DB a few seconds after the user stops typing, or on blur/navigation")
  const triggerDebouncedSave = useCallback(() => {
    setSaveStatus("saving");
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      performSave();
    }, 1200);
  }, [performSave]);

  const handleClose = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    performSave({ createRevision: true, changeSummary: "Saved on close" });
    closeNoteEditor();
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    triggerDebouncedSave();
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    triggerDebouncedSave();
  };

  const handleChecklistToggle = () => {
    if (!isChecklist) {
      // Convert lines of text to checklist
      const lines = content.split("\n").filter((l) => l.trim().length > 0);
      const items = lines.length
        ? lines.map((l, idx) => ({ id: `chk_${Date.now()}_${idx}`, text: l.replace(/^[-*]\s*/, ""), checked: false }))
        : [{ id: `chk_${Date.now()}_0`, text: "", checked: false }];
      setChecklistItems(items);
      setIsChecklist(true);
    } else {
      // Convert checklist back to text
      const text = checklistItems.map((c) => (c.checked ? `[x] ${c.text}` : `[ ] ${c.text}`)).join("\n");
      setContent(text);
      setIsChecklist(false);
    }
    triggerDebouncedSave();
  };

  const handleCheckItemText = (idx: number, text: string) => {
    const updated = [...checklistItems];
    updated[idx].text = text;
    setChecklistItems(updated);
    triggerDebouncedSave();
  };

  const handleCheckItemToggle = (idx: number) => {
    const updated = [...checklistItems];
    updated[idx].checked = !updated[idx].checked;
    setChecklistItems(updated);
    triggerDebouncedSave();
  };

  const handleAddCheckItem = () => {
    setChecklistItems([
      ...checklistItems,
      { id: `chk_${Date.now()}_${checklistItems.length}`, text: "", checked: false },
    ]);
  };

  const handleRemoveCheckItem = (idx: number) => {
    const updated = checklistItems.filter((_, i) => i !== idx);
    setChecklistItems(updated);
    triggerDebouncedSave();
  };

  const handleExport = (format: string) => {
    if (!currentItemIdRef.current) return;
    window.open(`/api/notes/export?itemId=${currentItemIdRef.current}&format=${format}`, "_blank");
  };

  if (!isNoteEditorOpen) return null;

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;
  const activeColors = resolveNoteColors(color, isDark);

  return (
    <>
      <div
        style={{ zIndex: Z_INDEX.modalBackdrop }}
        className="fixed inset-0 flex items-center justify-center bg-black/45 dark:bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      >
        <div
          style={{
            zIndex: Z_INDEX.modals,
            backgroundColor: activeColors.background,
            borderColor: activeColors.border,
          }}
          className={cn(
            "w-full rounded-2xl shadow-[var(--shadow-modal)] border flex flex-col transition-all duration-200 overflow-hidden modal-morph-enter",
            isFullScreen
              ? "fixed inset-3 max-w-none max-h-none h-[calc(100vh-24px)]"
              : "max-w-2xl max-h-[85vh] h-[550px]"
          )}
        >
          {/* Header Bar */}
          <div className="p-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between gap-2">
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              onBlur={() => performSave()}
              placeholder="Title"
              className="flex-1 bg-transparent font-semibold text-lg text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none"
            />

            <div className="flex items-center gap-1">
              {/* Autosave Status Indicator - Subtle Hairline Ring & Checkmark */}
              <div className="text-xs mr-2 flex items-center gap-1.5 font-mono">
                {saveStatus === "saving" && (
                  <span className="flex items-center gap-1.5 text-[var(--text-muted)]">
                    <span className="w-2.5 h-2.5 rounded-full border border-[var(--accent)] border-t-transparent animate-spin" />
                    <span className="text-[11px]">Saving</span>
                  </span>
                )}
                {saveStatus === "saved" && (
                  <span className="flex items-center gap-1 text-[var(--success)] transition-opacity duration-300">
                    <Check className="w-3.5 h-3.5" />
                    <span className="text-[11px]">Saved</span>
                  </span>
                )}
                {saveStatus === "error" && (
                  <span className="flex items-center gap-1 text-[var(--danger)]">
                    <span className="text-[11px]">Save failed</span>
                  </span>
                )}
              </div>

              {/* Fullscreen toggle */}
              <button
                onClick={() => setIsFullScreen(!isFullScreen)}
                title={isFullScreen ? "Exit Fullscreen" : "Fullscreen"}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              {/* Close button */}
              <button
                onClick={handleClose}
                title="Close and Save"
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body Editor Area */}
          <div className="flex-1 p-5 overflow-y-auto">
            {isChecklist ? (
              <div className="space-y-2">
                {checklistItems.map((chk, idx) => (
                  <div key={chk.id || idx} className="flex items-center gap-2 group">
                    <input
                      type="checkbox"
                      checked={chk.checked}
                      onChange={() => handleCheckItemToggle(idx)}
                      className="rounded text-[var(--accent)] cursor-pointer"
                    />
                    <input
                      type="text"
                      value={chk.text}
                      onChange={(e) => handleCheckItemText(idx, e.target.value)}
                      placeholder="List item..."
                      className={cn(
                        "flex-1 bg-transparent text-sm text-[var(--text-primary)] focus:outline-none",
                        chk.checked && "line-through text-[var(--text-faint)]"
                      )}
                    />
                    <button
                      onClick={() => handleRemoveCheckItem(idx)}
                      className="opacity-0 group-hover:opacity-100 text-[var(--text-faint)] hover:text-[var(--danger)] transition p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={handleAddCheckItem}
                  className="flex items-center gap-1.5 text-xs text-[var(--accent)] hover:underline font-medium pt-2 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>List item</span>
                </button>
              </div>
            ) : (
              <textarea
                value={content}
                onChange={handleContentChange}
                onBlur={() => performSave()}
                placeholder="Take a note..."
                className="w-full h-full bg-transparent resize-none focus:outline-none text-[var(--text-primary)] text-sm leading-relaxed placeholder:text-[var(--text-faint)] font-normal"
              />
            )}
          </div>

          {/* Footer Toolbar */}
          <div className="p-3 border-t border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] flex items-center justify-between text-xs text-[var(--text-muted)]">
            {/* Left Tools */}
            <div className="flex items-center gap-2">
              {/* Archival Swatches Popover */}
              <div className="relative">
                <button
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  title="Archival note swatches"
                  className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <Palette className="w-4 h-4" />
                </button>
                {showColorPicker && (
                  <div
                    style={{ zIndex: Z_INDEX.dropdowns }}
                    className="absolute left-0 bottom-full mb-2 p-2 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-xl shadow-[var(--shadow-popover)] flex items-center gap-1.5"
                  >
                    {ARCHIVAL_NOTE_SWATCHES.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setColor(s.id);
                          setShowColorPicker(false);
                          triggerDebouncedSave();
                        }}
                        style={{
                          backgroundColor: isDark ? s.darkBg : s.lightBg,
                          borderColor: isDark ? s.darkBorder : s.lightBorder,
                        }}
                        title={`${s.name}: ${s.description}`}
                        className="w-6 h-6 rounded-full border hover:scale-115 transition-transform"
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Checklist Toggle */}
              <button
                onClick={handleChecklistToggle}
                title={isChecklist ? "Switch to Text" : "Switch to Checklist"}
                className={cn(
                  "p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition flex items-center gap-1",
                  isChecklist && "bg-black/5 dark:bg-white/10 font-medium text-[var(--text-primary)]"
                )}
              >
                <CheckSquare className="w-4 h-4" />
                <span>{isChecklist ? "Text" : "Checklist"}</span>
              </button>

              {/* Version History Button */}
              {currentItemIdRef.current && (
                <button
                  onClick={() => setIsVersionsDrawerOpen(true)}
                  title="Version History"
                  className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition flex items-center gap-1 text-[var(--accent)] font-medium"
                >
                  <History className="w-4 h-4" />
                  <span>History</span>
                </button>
              )}

              {/* Export Dropdown */}
              {currentItemIdRef.current && (
                <div className="relative group">
                  <button
                    title="Export Note"
                    className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export</span>
                  </button>
                  <div
                    style={{ zIndex: Z_INDEX.dropdowns }}
                    className="hidden group-hover:block absolute left-0 bottom-full mb-1 w-36 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-xl shadow-[var(--shadow-popover)] p-1 space-y-0.5"
                  >
                    <button
                      onClick={() => handleExport("md")}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-xs text-[var(--text-primary)] transition"
                    >
                      Markdown (.md)
                    </button>
                    <button
                      onClick={() => handleExport("pdf")}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-xs text-[var(--text-primary)] transition"
                    >
                      PDF Document
                    </button>
                    <button
                      onClick={() => handleExport("html")}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-xs text-[var(--text-primary)] transition"
                    >
                      HTML (.html)
                    </button>
                    <button
                      onClick={() => handleExport("txt")}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-xs text-[var(--text-primary)] transition"
                    >
                      Plain Text (.txt)
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Word/character count & Close */}
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-[var(--text-faint)] font-mono hidden sm:inline">
                {wordCount} words · {charCount} chars
              </span>
              <button
                onClick={handleClose}
                className="px-4 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] rounded-lg text-xs font-medium transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Version History Drawer */}
      {currentItemIdRef.current && (
        <NoteVersionsDrawer
          itemId={currentItemIdRef.current}
          isOpen={isVersionsDrawerOpen}
          onClose={() => setIsVersionsDrawerOpen(false)}
          onRestored={() => {
            refreshData();
            closeNoteEditor();
          }}
        />
      )}
    </>
  );
}
