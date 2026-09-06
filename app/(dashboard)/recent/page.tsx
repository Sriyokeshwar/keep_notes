"use client";

import React, { useEffect, useState } from "react";
import { useVault, VaultItem } from "@/components/providers/VaultContext";
import { NoteCard } from "@/components/notes/NoteCard";
import { Clock, FileText, Download, Link as LinkIcon } from "lucide-react";
import { formatBytes, formatDate } from "@/lib/utils";

export default function RecentPage() {
  const { openPreview } = useVault();
  const [recentItems, setRecentItems] = useState<VaultItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecent = async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/items?recent=true&sort=modified&order=desc");
        if (res.ok) {
          const data = await res.json();
          setRecentItems(data.items || []);
        }
      } catch (err) {
        console.error("Failed to load recent items", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRecent();
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-600" />
          <span>Recent Activity</span>
        </h2>
        <p className="text-xs text-neutral-500 mt-0.5">
          Notes, files, and links you have recently created or edited.
        </p>
      </div>

      {isLoading ? (
        <div className="text-xs text-neutral-400 py-12 text-center">Loading recent items...</div>
      ) : recentItems.length === 0 ? (
        <div className="text-center py-20 text-neutral-400 text-xs">
          No recent items found.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {recentItems.map((item) =>
            item.type === "note" ? (
              <NoteCard key={item.id} item={item} />
            ) : (
              <div
                key={item.id}
                onClick={() => openPreview(item)}
                className="group relative rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 hover:shadow-md transition cursor-pointer flex flex-col justify-between"
              >
                <div className="w-full h-28 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-2 overflow-hidden">
                  {item.mimeType.startsWith("image/") && item.storageFileId ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/items/${item.id}/download`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : item.type === "link" ? (
                    <LinkIcon className="w-8 h-8 text-blue-500" />
                  ) : (
                    <FileText className="w-8 h-8 text-indigo-500" />
                  )}
                </div>
                <div>
                  <h4 className="font-semibold text-xs truncate">{item.name}</h4>
                  <p className="text-[11px] text-neutral-400 font-mono">
                    {formatBytes(item.size)} &bull; {formatDate(item.updatedAt)}
                  </p>
                </div>
                <div className="pt-2 mt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end">
                  <a
                    href={`/api/items/${item.id}/download`}
                    download={item.name}
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 rounded text-neutral-400 hover:text-neutral-700"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
