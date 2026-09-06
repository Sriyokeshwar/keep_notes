"use client";

import React, { useState } from "react";
import { VaultItem, useVault } from "@/components/providers/VaultContext";
import { useTheme } from "@/components/providers/ThemeProvider";
import { ARCHIVAL_NOTE_SWATCHES, resolveNoteColors } from "@/lib/tokens/theme";
import { Z_INDEX } from "@/lib/tokens/zIndex";
import {
  Pin,
  MoreVertical,
  CheckSquare,
  Palette,
  Share2,
  Trash2,
  Download,
  Copy,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function NoteCard({ item }: { item: VaultItem }) {
  const { openNoteEditor, openShare, openDetails, refreshData } = useVault();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [showMenu, setShowMenu] = useState(false);
  const [showColors, setShowColors] = useState(false);

  const note = item.note;
  const colors = resolveNoteColors(note?.color, isDark);

  const handleTogglePin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned: !item.isPinned }),
      });
      refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleColorChange = async (e: React.MouseEvent, colorId: string) => {
    e.stopPropagation();
    setShowColors(false);
    try {
      await fetch("/api/notes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, color: colorId }),
      });
      refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleChecklist = async (
    e: React.MouseEvent,
    checkIndex: number
  ) => {
    e.stopPropagation();
    if (!note || !note.checklistItems) return;
    const updated = [...note.checklistItems];
    updated[checkIndex] = {
      ...updated[checkIndex],
      checked: !updated[checkIndex].checked,
    };

    try {
      await fetch("/api/notes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: item.id,
          checklistItems: updated,
        }),
      });
      refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/items/${item.id}`, { method: "DELETE" });
      refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleExport = (e: React.MouseEvent, format: string) => {
    e.stopPropagation();
    setShowMenu(false);
    window.open(`/api/notes/export?itemId=${item.id}&format=${format}`, "_blank");
  };

  return (
    <div
      onClick={() => openNoteEditor(item)}
      style={{
        backgroundColor: colors.background,
        borderColor: colors.border,
      }}
      className="group relative rounded-xl border p-4 cursor-pointer shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all duration-200 flex flex-col justify-between overflow-hidden select-none hover:border-[var(--border-strong)]"
    >
      {/* Top Header: Title and Pin */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-sm text-[var(--text-primary)] line-clamp-1">
            {item.name || "Untitled Note"}
          </h3>
          <button
            onClick={handleTogglePin}
            title={item.isPinned ? "Unpin note" : "Pin note"}
            className={cn(
              "p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-opacity opacity-0 group-hover:opacity-100",
              item.isPinned && "opacity-100 text-[var(--accent)] font-bold"
            )}
          >
            <Pin className={cn("w-3.5 h-3.5", item.isPinned && "fill-current")} />
          </button>
        </div>

        {/* Note Body or Checklist */}
        {note?.isChecklist && note.checklistItems && note.checklistItems.length > 0 ? (
          <div className="space-y-1.5 my-2">
            {note.checklistItems.slice(0, 5).map((chk, idx) => (
              <div
                key={chk.id || idx}
                onClick={(e) => handleToggleChecklist(e, idx)}
                className="flex items-center gap-2 text-xs text-[var(--text-primary)]"
              >
                <input
                  type="checkbox"
                  checked={chk.checked}
                  onChange={() => {}}
                  className="rounded text-[var(--accent)] cursor-pointer"
                />
                <span
                  className={cn(
                    "truncate",
                    chk.checked && "line-through text-[var(--text-faint)]"
                  )}
                >
                  {chk.text || "Item"}
                </span>
              </div>
            ))}
            {note.checklistItems.length > 5 && (
              <div className="text-[11px] text-[var(--text-muted)] italic">
                +{note.checklistItems.length - 5} more items...
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-[var(--text-muted)] line-clamp-6 whitespace-pre-line mb-3 font-normal leading-relaxed">
            {note?.content || "(Empty note)"}
          </p>
        )}
      </div>

      {/* Footer Bar & Quick Action Palette */}
      <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Left: Color picker trigger */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowColors(!showColors);
            }}
            title="Archival swatches"
            className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <Palette className="w-3.5 h-3.5" />
          </button>

          {showColors && (
            <div
              style={{ zIndex: Z_INDEX.dropdowns }}
              onClick={(e) => e.stopPropagation()}
              className="absolute left-0 bottom-full mb-1.5 p-1.5 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-xl shadow-[var(--shadow-popover)] flex items-center gap-1.5"
            >
              {ARCHIVAL_NOTE_SWATCHES.map((swatch) => (
                <button
                  key={swatch.id}
                  onClick={(e) => handleColorChange(e, swatch.id)}
                  style={{ backgroundColor: isDark ? swatch.darkBg : swatch.lightBg, borderColor: isDark ? swatch.darkBorder : swatch.lightBorder }}
                  title={`${swatch.name}: ${swatch.description}`}
                  className="w-5 h-5 rounded-full border hover:scale-115 transition-transform"
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: Actions Menu */}
        <div className="relative flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openShare({ type: "item", id: item.id, name: item.name });
            }}
            title="Share"
            className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            title="More actions"
            className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>

          {showMenu && (
            <div
              style={{ zIndex: Z_INDEX.dropdowns }}
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 bottom-full mb-1.5 w-44 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-xl shadow-[var(--shadow-popover)] p-1 space-y-0.5 text-xs text-[var(--text-primary)]"
            >
              <button
                onClick={(e) => {
                  setShowMenu(false);
                  openDetails(item);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-left transition-colors"
              >
                <Info className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span>Note Details</span>
              </button>
              <div className="h-px bg-[var(--border-subtle)] my-1" />
              <div className="px-2 py-0.5 text-[11px] font-medium text-[var(--text-muted)]">
                Export As
              </div>
              <button
                onClick={(e) => handleExport(e, "md")}
                className="w-full flex items-center gap-2 px-2.5 py-1 rounded-lg hover:bg-[var(--surface-hover)] text-left transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span>Markdown (.md)</span>
              </button>
              <button
                onClick={(e) => handleExport(e, "pdf")}
                className="w-full flex items-center gap-2 px-2.5 py-1 rounded-lg hover:bg-[var(--surface-hover)] text-left transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span>PDF Document</span>
              </button>
              <button
                onClick={(e) => handleExport(e, "html")}
                className="w-full flex items-center gap-2 px-2.5 py-1 rounded-lg hover:bg-[var(--surface-hover)] text-left transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span>HTML (.html)</span>
              </button>
              <button
                onClick={(e) => handleExport(e, "txt")}
                className="w-full flex items-center gap-2 px-2.5 py-1 rounded-lg hover:bg-[var(--surface-hover)] text-left transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span>Plain Text (.txt)</span>
              </button>
              <div className="h-px bg-[var(--border-subtle)] my-1" />
              <button
                onClick={handleDelete}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--danger-subtle)] text-[var(--danger)] text-left transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Move to Trash</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
