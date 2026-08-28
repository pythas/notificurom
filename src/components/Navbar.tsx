'use client';

import React from 'react';
import {
  RotateCw,
  Settings,
  Plus,
  Search,
  CheckSquare,
} from 'lucide-react';

interface NavbarProps {
  onSync: () => Promise<void>;
  isSyncing: boolean;
  lastSyncTime: string | null;
  searchFilter: string;
  onSearchChange: (value: string) => void;
  sourceFilter: string;
  onSourceFilterChange: (value: string) => void;
  onOpenSettings: () => void;
  onOpenNewTask: () => void;
  totalTaskCount: number;
}

export function Navbar({
  onSync,
  isSyncing,
  lastSyncTime,
  searchFilter,
  onSearchChange,
  sourceFilter,
  onSourceFilterChange,
  onOpenSettings,
  onOpenNewTask,
  totalTaskCount,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 px-4 py-2.5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 max-w-[1920px] mx-auto">
        {/* Left: Branding & Counts */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <CheckSquare className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-zinc-100 tracking-tight">
                  Notificurom
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-semibold uppercase">
                  GTD
                </span>
              </div>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-zinc-800 text-xs text-zinc-400 font-mono">
            <span>{totalTaskCount} active</span>
          </div>
        </div>

        {/* Center: Search & Filter */}
        <div className="flex items-center gap-2 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Filter tasks by title, repo, or author... (/)"
              value={searchFilter}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={sourceFilter}
            onChange={(e) => onSourceFilterChange(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Items</option>
            <option value="github_pr">PRs Only</option>
            <option value="review_request">Review Requests</option>
            <option value="github_issue">Issues Only</option>
          </select>
        </div>

        {/* Right: Actions (Sync, Add, Settings) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            title={lastSyncTime ? `Last synced: ${new Date(lastSyncTime).toLocaleTimeString()}` : 'Sync from GitHub'}
          >
            <RotateCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-400' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenNewTask}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Task</span>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg border border-zinc-800/80 transition-colors"
            title="Configure GitHub PAT & Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
