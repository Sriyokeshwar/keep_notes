"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut, signIn } from "next-auth/react";
import {
  Folder,
  Star,
  Clock,
  Share2,
  Trash2,
  HardDrive,
  Database,
  Cloud,
  LogOut,
  User as UserIcon,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { name: "My Files", href: "/vault", icon: Folder },
  { name: "Favorites", href: "/favorites", icon: Star },
  { name: "Recent", href: "/recent", icon: Clock },
  { name: "Shared with me", href: "/shared", icon: Share2 },
  { name: "Trash", href: "/trash", icon: Trash2 },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside className="w-64 border-r border-[var(--border)] bg-[var(--surface-primary)] flex flex-col h-screen select-none transition-colors duration-150">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 gap-3 border-b border-[var(--border)]">
        <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center text-[var(--accent-fg)] font-semibold shadow-xs">
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <h1 className="font-semibold text-sm tracking-tight text-[var(--text-primary)]">
            Knowledge Vault
          </h1>
          <p className="text-[11px] text-[var(--text-muted)] font-mono">Drive + Keep</p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href === "/vault" && pathname.startsWith("/vault"));
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent-subtle-border)] font-medium"
                  : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] border border-transparent"
              )}
            >
              <Icon className={cn("w-4 h-4", isActive ? "text-[var(--accent)]" : "text-[var(--text-faint)]")} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>

      {/* Architecture Separation Badge */}
      <div className="p-3 mx-3 mb-3 rounded-xl bg-[var(--surface-ground)] border border-[var(--border-subtle)] text-xs">
        <div className="font-medium text-[var(--text-primary)] mb-1.5 flex items-center gap-1.5">
          <HardDrive className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <span>Storage Separation</span>
        </div>
        <div className="space-y-1 text-[11px] text-[var(--text-muted)]">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Database className="w-3 h-3 text-[var(--success)]" /> MongoDB
            </span>
            <span className="text-[10px] text-[var(--success)] font-medium">Metadata</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Cloud className="w-3 h-3 text-[var(--accent)]" /> Google Drive
            </span>
            <span className="text-[10px] text-[var(--accent)] font-medium">File Bytes</span>
          </div>
        </div>
      </div>

      {/* User Profile & Auth */}
      <div className="p-3 border-t border-[var(--border)] flex items-center justify-between">
        {session?.user ? (
          <div className="flex items-center gap-2.5 min-w-0">
            {session.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt={session.user.name || "User"}
                className="w-8 h-8 rounded-full border border-[var(--border)] object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-center text-xs font-semibold">
                <UserIcon className="w-4 h-4 text-[var(--text-muted)]" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium truncate text-[var(--text-primary)]">
                {session.user.name || "Vault Member"}
              </div>
              <div className="text-[10px] text-[var(--text-muted)] truncate">
                {session.user.email}
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/auth/signin" })}
              title="Sign Out"
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--surface-hover)] transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => signIn()}
            className="w-full py-1.5 px-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] rounded-lg text-xs font-medium transition-colors text-center"
          >
            Sign In
          </button>
        )}
      </div>
    </aside>
  );
}
