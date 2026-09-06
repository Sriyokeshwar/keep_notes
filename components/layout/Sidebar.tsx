"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut, signIn } from "next-auth/react";
import { Z_INDEX } from "@/lib/tokens/zIndex";
import {
  Folder,
  Star,
  Clock,
  Share2,
  Trash2,
  HardDrive,
  Cloud,
  LogOut,
  User as UserIcon,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X,
  Compass,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { name: "My Files", href: "/vault", icon: Folder, countKey: "all" },
  { name: "Favorites", href: "/favorites", icon: Star, countKey: "fav" },
  { name: "Recent", href: "/recent", icon: Clock, countKey: "rec" },
  { name: "Shared with me", href: "/shared", icon: Share2, countKey: "shared" },
  { name: "Trash", href: "/trash", icon: Trash2, countKey: "trash" },
];

interface SidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({
  isMobileOpen = false,
  onMobileClose,
  isCollapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

  // Close mobile drawer on route change
  useEffect(() => {
    if (isMobileOpen && onMobileClose) {
      onMobileClose();
    }
  }, [pathname]);

  const sidebarContent = (
    <div className="flex flex-col h-full select-none">
      {/* Brand Header */}
      <div className={cn(
        "h-16 flex items-center border-b border-[var(--border)] transition-all",
        isCollapsed ? "justify-center px-2" : "justify-between px-5"
      )}>
        <Link href="/vault" className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[var(--accent)] flex items-center justify-center text-[var(--accent-fg)] font-semibold shadow-xs flex-shrink-0 transition-transform hover:scale-105">
            <Sparkles className="w-4 h-4" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <h1 className="font-semibold text-sm tracking-tight text-[var(--text-primary)] truncate">
                Knowledge Vault
              </h1>
              <span className="text-[10px] text-[var(--text-muted)] font-mono block truncate">
                Spatial Workspace
              </span>
            </div>
          )}
        </Link>

        {/* Mobile close button */}
        {onMobileClose && (
          <button
            onClick={onMobileClose}
            className="md:hidden p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Desktop collapse toggle */}
        {onToggleCollapse && !onMobileClose && (
          <button
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden md:flex p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href === "/vault" && pathname.startsWith("/vault"));
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              title={isCollapsed ? item.name : undefined}
              className={cn(
                "group relative flex items-center rounded-xl text-xs font-medium transition-all",
                isCollapsed
                  ? "justify-center p-2.5 my-1"
                  : "gap-3 px-3 py-2.5",
                isActive
                  ? "bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent-subtle-border)] shadow-xs font-semibold"
                  : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] border border-transparent"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110",
                  isActive ? "text-[var(--accent)]" : "text-[var(--text-faint)]"
                )}
              />
              {!isCollapsed && <span className="truncate">{item.name}</span>}

              {/* Active Indicator Bar */}
              {isActive && (
                <span className="absolute left-0 inset-y-1.5 w-1 rounded-r-full bg-[var(--accent)]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Modern Storage Quota Meter */}
      {!isCollapsed && (
        <div className="p-3.5 mx-3 mb-3 rounded-2xl bg-[var(--surface-ground)] border border-[var(--border-subtle)] text-xs space-y-2 shadow-2xs">
          <div className="flex items-center justify-between font-medium text-[var(--text-primary)] text-[11px]">
            <span className="flex items-center gap-1.5 text-[var(--text-muted)]">
              <HardDrive className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Vault Storage</span>
            </span>
            <span className="font-mono text-[10px] text-[var(--accent)] font-semibold">1%</span>
          </div>

          <div className="w-full h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
            <div
              className="h-full bg-[var(--accent)] rounded-full transition-all duration-500"
              style={{ width: "2%" }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
            <span>Using 12.4 MB of 1 GB</span>
            <span className="flex items-center gap-1 text-[var(--text-faint)]">
              <Cloud className="w-2.5 h-2.5 text-[var(--accent)]" /> Cloud
            </span>
          </div>
        </div>
      )}

      {/* User Profile & Auth */}
      <div className={cn(
        "p-3 border-t border-[var(--border)] flex items-center transition-all",
        isCollapsed ? "justify-center" : "justify-between"
      )}>
        {session?.user ? (
          <div className={cn("flex items-center gap-2.5 min-w-0", isCollapsed ? "justify-center" : "flex-1")}>
            {session.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt={session.user.name || "User"}
                className="w-8 h-8 rounded-full border border-[var(--border)] object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-center text-xs font-semibold flex-shrink-0">
                <UserIcon className="w-4 h-4 text-[var(--text-muted)]" />
              </div>
            )}
            {!isCollapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold truncate text-[var(--text-primary)]">
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
              </>
            )}
          </div>
        ) : (
          <button
            onClick={() => signIn()}
            className={cn(
              "py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] rounded-xl text-xs font-medium transition-colors text-center",
              isCollapsed ? "p-2" : "w-full px-3"
            )}
          >
            {isCollapsed ? <UserIcon className="w-4 h-4" /> : "Sign In"}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop & Tablet Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col h-screen border-r border-[var(--border)] bg-[var(--surface-primary)] transition-all duration-200 ease-in-out relative z-10",
          isCollapsed ? "w-18" : "w-60"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div
          style={{ zIndex: Z_INDEX.drawers }}
          className="fixed inset-0 md:hidden bg-black/60 backdrop-blur-xs flex"
          onClick={onMobileClose}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-72 h-full bg-[var(--surface-primary)] border-r border-[var(--border)] shadow-2xl modal-morph-enter flex flex-col"
          >
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
