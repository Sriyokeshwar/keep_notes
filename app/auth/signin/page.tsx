"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { Sparkles, Shield, ArrowRight, HardDrive, Database, Cloud } from "lucide-react";

export default function SignInPage() {
  const [email, setEmail] = useState("owner@vault.local");
  const [name, setName] = useState("Vault Owner");
  const [isLoading, setIsLoading] = useState(false);

  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await signIn("dev-login", {
      email,
      name,
      callbackUrl: "/vault",
    });
  };

  const handleGoogleLogin = () => {
    signIn("google", { callbackUrl: "/vault" });
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-neutral-100 dark:bg-neutral-950 p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl p-8 space-y-6 select-none">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white mx-auto flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Personal Knowledge Vault
          </h1>
          <p className="text-xs text-neutral-500">
            Private, lightweight Drive + Keep for you and trusted friends
          </p>
        </div>

        {/* Architecture Note */}
        <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-xs space-y-1.5">
          <div className="font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-indigo-500" />
            <span>Architecture Separation</span>
          </div>
          <div className="text-[11px] text-neutral-500 flex justify-between">
            <span>Metadata & ACL</span>
            <span className="font-semibold text-emerald-600">MongoDB</span>
          </div>
          <div className="text-[11px] text-neutral-500 flex justify-between">
            <span>Storage Provider</span>
            <span className="font-semibold text-blue-600">Google Drive / Local</span>
          </div>
        </div>

        {/* Google OAuth Option */}
        <div className="space-y-3">
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-2xl text-xs font-semibold shadow-xs transition"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Sign in with Google (drive.file scope)</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
            <span className="text-[10px] uppercase font-semibold text-neutral-400">
              or private vault login
            </span>
            <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
          </div>

          {/* Dev / Private Login Form */}
          <form onSubmit={handleDevLogin} className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                Your Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@vault.local"
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                Display Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Vault Owner"
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 rounded-2xl text-xs font-semibold shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{isLoading ? "Signing in..." : "Enter Vault"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
