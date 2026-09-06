"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useVault, VaultItem, VaultFolder } from "@/components/providers/VaultContext";
import {
  Folder,
  FileText,
  StickyNote,
  Link as LinkIcon,
  Image as ImageIcon,
  Film,
  Music,
  Download,
  Share2,
  Trash2,
  Star,
  MoreHorizontal,
} from "lucide-react";
import { formatBytes, formatDate } from "@/lib/utils";

export function FolderList() {
  const router = useRouter();
  const { folders, items, openPreview, openShare, openDetails, refreshData } = useVault();

  const handleToggleFavorite = async (e: React.MouseEvent, item: VaultItem) => {
    e.stopPropagation();
    try {
      await fetch(`/api/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: !item.isFavorite }),
      });
      refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string, type: "folder" | "item") => {
    e.stopPropagation();
    try {
      if (type === "folder") {
        if (!confirm("Move folder to trash?")) return;
        await fetch(`/api/folders/${id}`, { method: "DELETE" });
      } else {
        await fetch(`/api/items/${id}`, { method: "DELETE" });
      }
      refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden bg-white dark:bg-neutral-900 select-none">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 font-medium">
            <th className="py-3 px-4 w-8"></th>
            <th className="py-3 px-4">Name</th>
            <th className="py-3 px-4 w-28">Type</th>
            <th className="py-3 px-4 w-24">Size</th>
            <th className="py-3 px-4 w-36">Modified</th>
            <th className="py-3 px-4 w-24 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
          {/* Folders */}
          {folders.map((folder) => (
            <tr
              key={folder.id}
              onClick={() => router.push(`/vault/${folder.id}`)}
              className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 cursor-pointer transition"
            >
              <td className="py-2.5 px-4 text-center">
                <Folder className="w-4 h-4 text-indigo-500" />
              </td>
              <td className="py-2.5 px-4 font-medium text-neutral-900 dark:text-neutral-100">
                {folder.name}
              </td>
              <td className="py-2.5 px-4 text-neutral-400 capitalize">Folder</td>
              <td className="py-2.5 px-4 text-neutral-400 font-mono">
                {folder.itemCount || 0} items
              </td>
              <td className="py-2.5 px-4 text-neutral-400">
                {formatDate(folder.updatedAt)}
              </td>
              <td className="py-2.5 px-4 text-right">
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openShare({ type: "folder", id: folder.id, name: folder.name });
                    }}
                    title="Share"
                    className="p-1 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-400"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, folder.id, "folder")}
                    title="Delete"
                    className="p-1 rounded-lg hover:bg-red-50 text-neutral-400 hover:text-red-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}

          {/* Items */}
          {items.map((item) => {
            const isNote = item.type === "note";
            const isLink = item.type === "link";
            return (
              <tr
                key={item.id}
                onClick={() => {
                  if (isLink && item.metadata?.url) {
                    window.open(item.metadata.url, "_blank");
                  } else {
                    openPreview(item);
                  }
                }}
                className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 cursor-pointer transition group"
              >
                <td className="py-2.5 px-4 text-center">
                  <button
                    onClick={(e) => handleToggleFavorite(e, item)}
                    className="text-neutral-300 hover:text-amber-500"
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${
                        item.isFavorite ? "fill-amber-500 text-amber-500" : ""
                      }`}
                    />
                  </button>
                </td>
                <td className="py-2.5 px-4 font-medium text-neutral-800 dark:text-neutral-200">
                  <div className="flex items-center gap-2">
                    {isNote ? (
                      <StickyNote className="w-4 h-4 text-amber-500" />
                    ) : isLink ? (
                      <LinkIcon className="w-4 h-4 text-blue-500" />
                    ) : (
                      <FileText className="w-4 h-4 text-indigo-500" />
                    )}
                    <span className="truncate max-w-sm">{item.name}</span>
                  </div>
                </td>
                <td className="py-2.5 px-4 text-neutral-400 capitalize">{item.type}</td>
                <td className="py-2.5 px-4 text-neutral-400 font-mono">
                  {formatBytes(item.size)}
                </td>
                <td className="py-2.5 px-4 text-neutral-400">
                  {formatDate(item.updatedAt)}
                </td>
                <td className="py-2.5 px-4 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                    {!isLink && (
                      <a
                        href={`/api/items/${item.id}/download`}
                        download={item.name}
                        onClick={(e) => e.stopPropagation()}
                        title="Download"
                        className="p-1 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-400"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openShare({ type: "item", id: item.id, name: item.name });
                      }}
                      title="Share"
                      className="p-1 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-400"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openDetails(item);
                      }}
                      title="Details"
                      className="p-1 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-400"
                    >
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, item.id, "item")}
                      title="Delete"
                      className="p-1 rounded-lg hover:bg-red-50 text-neutral-400 hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
