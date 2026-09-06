import React from "react";
import { VaultProvider } from "@/components/providers/VaultContext";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <VaultProvider>
      <DashboardShell>{children}</DashboardShell>
    </VaultProvider>
  );
}
