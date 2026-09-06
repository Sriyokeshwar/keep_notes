"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useVault, VaultFolder, VaultItem } from "@/components/providers/VaultContext";
import { NoteCard } from "@/components/notes/NoteCard";
import { Share2, Folder, FileText, Download, Link as LinkIcon, User } from "lucide-react";
import { formatBytes, formatDate } from "@/lib/utils";

export default function SharedPage() {
  const { openPreview } = useVault();
  const [sharedFolders, setSharedFolders] = useState<any[]>([]);
  const [sharedItems, setSharedItems] = useState<VaultItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchShared = async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/shared");
        if (res.ok) {
          const data = await res.json();
          setSharedFolders(data.folders || []);
          setSharedItems(data.items || []);
        }
      } catch (err) {
        console.error("Failed to load shared items", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchShared();
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6 select-none">
      <div>
        <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <Share2 className="w-5 h-5 text-indigo-600" />
          <span>Shared with me</span>
        </h2>
        <p className="text-xs text-neutral-500 mt-0.5">
          Folders, notes, and files shared by your trusted friends.
        </p>
      </div>

      {isLoading ? (
        <div className="text-xs text-neutral-400 py-12 text-center">Loading shared files...</div>
      ) : sharedFolders.length === 0 && sharedItems.length === 0 ? (
        <div className="text-center py-20 text-neutral-400 text-xs">
          No files or folders have been shared with you yet.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Shared Folders */}
          {sharedFolders.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                Folders ({sharedFolders.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {sharedFolders.map((f) => (
                  <Link
                    key={f.id}
                    href={`/vault/${f.id}`}
                    className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-indigo-400 transition block"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Folder className="w-5 h-5 text-indigo-500" />
                      <span className="font-semibold text-xs truncate">{f.name}</span>
                    </div>
                    {f.ownerId?.name && (
                      <div className="text-[10px] text-neutral-400 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>Owner: {f.ownerId.name}</span>
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Shared Items & Notes */}
          {sharedItems.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                Files & Notes ({sharedItems.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {sharedItems.map((item) =>
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
                          {formatBytes(item.size)} &bull; {formatDate(item.createdAt).split(",")[0]}
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}
