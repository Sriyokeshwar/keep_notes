"use client";

import React, { useEffect, useState } from "react";
import { useVault, VaultItem } from "@/components/providers/VaultContext";
import { NoteCard } from "@/components/notes/NoteCard";
import { Star, FileText, Image as ImageIcon, Film, Music, Download, Link as LinkIcon } from "lucide-react";
import { formatBytes, formatDate } from "@/lib/utils";

export default function FavoritesPage() {
  const { openPreview, openShare, refreshData } = useVault();
  const [favoriteItems, setFavoriteItems] = useState<VaultItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFavorites = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/items?favorites=true");
      if (res.ok) {
        const data = await res.json();
        setFavoriteItems(data.items || []);
      }
    } catch (err) {
      console.error("Failed to load favorites", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  const handleRemoveFavorite = async (itemId: string) => {
    try {
      await fetch(`/api/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: false }),
      });
      setFavoriteItems((prev) => prev.filter((i) => i.id !== itemId));
      refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
          <span>Favorites</span>
        </h2>
        <p className="text-xs text-neutral-500 mt-0.5">
          Items and notes you have starred for quick access.
        </p>
      </div>

      {isLoading ? (
        <div className="text-xs text-neutral-400 py-12 text-center">Loading favorites...</div>
      ) : favoriteItems.length === 0 ? (
        <div className="text-center py-20 text-neutral-400 text-xs">
          No favorite items yet. Star any file or note to view it here.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {favoriteItems.map((item) =>
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
                <div className="pt-2 mt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFavorite(item.id);
                    }}
                    className="text-xs text-amber-500 hover:underline flex items-center gap-1"
                  >
                    <Star className="w-3 h-3 fill-amber-500" />
                    <span>Unstar</span>
                  </button>
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
