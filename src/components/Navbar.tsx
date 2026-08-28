'use client';

import React, { useRef, useEffect } from 'react';
import {
  RotateCw,
  Settings,
  Plus,
  Search,
  CheckSquare,
  X,
  FilterX,
  Check,
} from 'lucide-react';
import { formatRelativeShort, useMounted } from '@/lib/date-utils';

interface NavbarProps {
  onSync: () => Promise<void>;
  isSyncing: boolean;
  justSynced?: boolean;
  lastSyncTime: string | null;
  searchFilter: string;
  onSearchChange: (value: string) => void;
  sourceFilter: string;
  onSourceFilterChange: (value: string) => void;
  onClearFilters: () => void;
  onOpenSettings: () => void;
  onOpenNewTask: () => void;
  totalTaskCount: number;
}

export function Navbar({
  onSync,
  isSyncing,
  justSynced = false,
  lastSyncTime,
  searchFilter,
  onSearchChange,
  sourceFilter,
  onSourceFilterChange,
  onClearFilters,
  onOpenSettings,
  onOpenNewTask,
  totalTaskCount,
}: NavbarProps) {
  const mounted = useMounted();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: '/' to focus search, 'Escape' to clear
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (e.key === '/' && !isInput) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        if (searchFilter) {
          onSearchChange('');
        } else {
          searchInputRef.current?.blur();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchFilter, onSearchChange]);

  const hasActiveFilters = Boolean(searchFilter.trim()) || sourceFilter !== 'all';

  const formatLastSyncText = () => {
    if (!mounted || !lastSyncTime) return 'Sync from GitHub';
    try {
      const relTime = formatRelativeShort(lastSyncTime);
      const exactTime = new Date(lastSyncTime).toLocaleTimeString();
      return `Last synced ${relTime} ago (${exactTime})`;
    } catch {
      return 'Sync from GitHub';
    }
  };

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
        <div className="flex items-center gap-2 flex-1 max-w-2xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Filter tasks by title, repo, or author... (/)"
              value={searchFilter}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-8 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            {searchFilter && (
              <button
                type="button"
                onClick={() => {
                  onSearchChange('');
                  searchInputRef.current?.focus();
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 p-0.5 rounded hover:bg-zinc-800 transition-colors"
                title="Clear search text (Esc)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="relative shrink-0">
            <select
              value={sourceFilter}
              onChange={(e) => onSourceFilterChange(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">All Items</option>
              <option value="github_pr">PRs Only</option>
              <option value="review_request">Review Requests</option>
              <option value="github_issue">Issues Only</option>
            </select>
          </div>

          {/* Clear All Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 border border-zinc-700/80 rounded-lg text-xs font-medium transition-colors shrink-0 animate-in fade-in duration-150"
              title="Reset search and filters"
            >
              <FilterX className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}
        </div>

        {/* Right: Actions (Sync, Add, Settings) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onSync}
            disabled={isSyncing}
            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium transition-all duration-200 disabled:opacity-60 ${
              justSynced
                ? 'bg-emerald-950/60 border-emerald-600/70 text-emerald-300 shadow-sm shadow-emerald-950'
                : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-200'
            }`}
            title={formatLastSyncText()}
          >
            {isSyncing ? (
              <RotateCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
            ) : justSynced ? (
              <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
            ) : (
              <RotateCw className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-200" />
            )}
            <span>
              {isSyncing ? 'Syncing...' : justSynced ? 'Synced!' : 'Sync'}
            </span>
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
