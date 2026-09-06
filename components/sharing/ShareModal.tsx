"use client";

import React, { useState, useEffect } from "react";
import { useVault } from "@/components/providers/VaultContext";
import { Z_INDEX } from "@/lib/tokens/zIndex";
import { Share2, X, UserPlus, Check, Copy, Trash2, Shield } from "lucide-react";

interface PermissionUser {
  id: string;
  userEmail: string;
  role: "owner" | "editor" | "viewer";
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
}

export function ShareModal() {
  const { shareResource, isShareOpen, closeShare } = useVault();
  const [permissions, setPermissions] = useState<PermissionUser[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"viewer" | "editor">("viewer");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!isShareOpen || !shareResource) return;

    const fetchPermissions = async () => {
      try {
        const res = await fetch(
          `/api/permissions?resourceType=${shareResource.type}&resourceId=${shareResource.id}`
        );
        if (res.ok) {
          const data = await res.json();
          setPermissions(data.permissions || []);
        }
      } catch (err) {
        console.error("Failed to fetch permissions:", err);
      }
    };

    fetchPermissions();
  }, [isShareOpen, shareResource]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareResource || !inviteEmail.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceType: shareResource.type,
          resourceId: shareResource.id,
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });

      if (res.ok) {
        setInviteEmail("");
        const data = await res.json();
        setPermissions((prev) => [...prev, data.permission]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async (permissionId: string) => {
    try {
      const res = await fetch(`/api/permissions?id=${permissionId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setPermissions((prev) => prev.filter((p) => p.id !== permissionId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (!isShareOpen || !shareResource) return null;

  return (
    <div
      style={{ zIndex: Z_INDEX.modalBackdrop }}
      className="fixed inset-0 flex items-center justify-center bg-black/45 dark:bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150"
    >
      <div
        style={{ zIndex: Z_INDEX.modals }}
        className="w-full max-w-md bg-[var(--surface-elevated)] rounded-2xl shadow-[var(--shadow-modal)] border border-[var(--border)] p-6 space-y-5 modal-morph-enter"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent-subtle)] border border-[var(--accent-subtle-border)] text-[var(--accent)] flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[var(--text-primary)]">
                Share with Friends
              </h3>
              <p className="text-[11px] text-[var(--text-muted)] truncate max-w-[220px]">
                {shareResource.name}
              </p>
            </div>
          </div>
          <button
            onClick={closeShare}
            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Invite Form */}
        <form onSubmit={handleInvite} className="flex gap-2">
          <input
            type="email"
            required
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="friend@example.com"
            className="flex-1 px-3 py-2 bg-[var(--surface-ground)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent)]"
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as any)}
            className="px-2.5 py-2 bg-[var(--surface-ground)] border border-[var(--border)] rounded-xl text-xs focus:outline-none font-medium text-[var(--text-primary)] cursor-pointer"
          >
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
          </select>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-3.5 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] rounded-xl text-xs font-medium shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Invite</span>
          </button>
        </form>

        {/* Access List */}
        <div className="space-y-2 max-h-48 overflow-y-auto">
          <div className="text-[11px] font-medium text-[var(--text-muted)]">
            Who has access
          </div>

          {permissions.length === 0 ? (
            <div className="text-xs text-[var(--text-muted)] py-2">
              Only you have access. Invite friends by entering their email above.
            </div>
          ) : (
            permissions.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--surface-ground)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)]"
              >
                <div className="min-w-0">
                  <div className="font-medium text-neutral-800 dark:text-neutral-200 truncate">
                    {p.user?.name || p.userEmail}
                  </div>
                  <div className="text-[10px] text-neutral-500 truncate">{p.userEmail}</div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="capitalize px-2 py-0.5 rounded-md bg-neutral-200 dark:bg-neutral-700 text-[10px] font-medium text-neutral-700 dark:text-neutral-300">
                    {p.role}
                  </span>
                  <button
                    onClick={() => handleRevoke(p.id)}
                    title="Remove access"
                    className="p-1 text-neutral-400 hover:text-red-500 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Copy Share Link */}
        <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 text-xs text-[var(--accent)] hover:underline font-medium transition-colors"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLink ? "Link copied" : "Copy link"}</span>
          </button>
          <button
            onClick={closeShare}
            className="px-4 py-1.5 rounded-xl text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
