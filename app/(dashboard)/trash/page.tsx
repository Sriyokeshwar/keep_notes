"use client";

import React, { useEffect, useState } from "react";
import { Trash2, RotateCcw, AlertTriangle, Folder, FileText } from "lucide-react";
import { formatBytes, formatDate } from "@/lib/utils";

export default function TrashPage() {
  const [trashedFolders, setTrashedFolders] = useState<any[]>([]);
  const [trashedItems, setTrashedItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTrash = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/trash");
      if (res.ok) {
        const data = await res.json();
        setTrashedFolders(data.folders || []);
        setTrashedItems(data.items || []);
      }
    } catch (err) {
      console.error("Failed to load trash", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrash();
  }, []);

  const handleRestore = async (type: "folder" | "item", id: string) => {
    try {
      const res = await fetch("/api/trash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore", type, id }),
      });
      if (res.ok) {
        fetchTrash();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePermanentDelete = async (type: "folder" | "item", id: string) => {
    if (!confirm("Permanently delete this item? This action cannot be undone.")) return;
    try {
      const res = await fetch(`/api/trash?type=${type}&id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchTrash();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEmptyTrash = async () => {
    if (!confirm("Empty entire trash bin? All items and folders will be deleted permanently.")) return;
    try {
      const res = await fetch("/api/trash?purgeAll=true", { method: "DELETE" });
      if (res.ok) {
        fetchTrash();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const totalCount = trashedFolders.length + trashedItems.length;

  return (
    <div className="max-w-7xl mx-auto space-y-6 select-none">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-500" />
            <span>Trash</span>
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Deleted items can be restored to your vault or purged permanently.
          </p>
        </div>

        {totalCount > 0 && (
          <button
            onClick={handleEmptyTrash}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Empty Trash</span>
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="text-xs text-neutral-400 py-12 text-center">Loading trash...</div>
      ) : totalCount === 0 ? (
        <div className="text-center py-20 text-neutral-400 text-xs">
          Trash is empty.
        </div>
      ) : (
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden bg-white dark:bg-neutral-900">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 font-medium">
                <th className="py-3 px-4 w-8"></th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4 w-24">Type</th>
                <th className="py-3 px-4 w-24">Size</th>
                <th className="py-3 px-4 w-36">Trashed Date</th>
                <th className="py-3 px-4 w-36 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
              {/* Folders */}
              {trashedFolders.map((f) => (
                <tr key={f.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                  <td className="py-2.5 px-4 text-center">
                    <Folder className="w-4 h-4 text-neutral-400" />
                  </td>
                  <td className="py-2.5 px-4 font-medium text-neutral-700 dark:text-neutral-300">
                    {f.name}
                  </td>
                  <td className="py-2.5 px-4 text-neutral-400 capitalize">Folder</td>
                  <td className="py-2.5 px-4 text-neutral-400 font-mono">-</td>
                  <td className="py-2.5 px-4 text-neutral-400">
                    {formatDate(f.trashedAt || f.updatedAt)}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleRestore("folder", f.id)}
                        title="Restore"
                        className="p-1 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 flex items-center gap-1 font-medium"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restore</span>
                      </button>
                      <button
                        onClick={() => handlePermanentDelete("folder", f.id)}
                        title="Delete Permanently"
                        className="p-1 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-950 flex items-center gap-1 font-medium"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {/* Items */}
              {trashedItems.map((item) => (
                <tr key={item.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                  <td className="py-2.5 px-4 text-center">
                    <FileText className="w-4 h-4 text-neutral-400" />
                  </td>
                  <td className="py-2.5 px-4 font-medium text-neutral-700 dark:text-neutral-300">
                    {item.name}
                  </td>
                  <td className="py-2.5 px-4 text-neutral-400 capitalize">{item.type}</td>
                  <td className="py-2.5 px-4 text-neutral-400 font-mono">
                    {formatBytes(item.size)}
                  </td>
                  <td className="py-2.5 px-4 text-neutral-400">
                    {formatDate(item.trashedAt || item.updatedAt)}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleRestore("item", item.id)}
                        title="Restore"
                        className="p-1 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 flex items-center gap-1 font-medium"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restore</span>
                      </button>
                      <button
                        onClick={() => handlePermanentDelete("item", item.id)}
                        title="Delete Permanently"
                        className="p-1 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-950 flex items-center gap-1 font-medium"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
