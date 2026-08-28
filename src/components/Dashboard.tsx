'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Task } from '@/db/schema';
import { SyncResult } from '@/lib/types';
import { Navbar } from './Navbar';
import { KanbanBoard } from './KanbanBoard';
import { SettingsModal } from './SettingsModal';
import { NewTaskModal } from './NewTaskModal';
import { AlertCircle, CheckCircle2, Key, Sparkles } from 'lucide-react';

interface DashboardProps {
  initialTasks: Task[];
  initialHasPat: boolean;
  initialLastSync: string | null;
}

export function Dashboard({
  initialTasks,
  initialHasPat,
  initialLastSync,
}: DashboardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [hasPat, setHasPat] = useState(initialHasPat);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(initialLastSync);
  const [isSyncing, setIsSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [banner, setBanner] = useState<{ type: 'info' | 'success' | 'error'; message: string } | null>(null);

  const handleClearFilters = useCallback(() => {
    setSearchFilter('');
    setSourceFilter('all');
  }, []);

  const refreshTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks');
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (err) {
      console.error('Failed to reload tasks', err);
    }
  }, []);

  const handleSync = useCallback(async () => {
    try {
      setIsSyncing(true);
      setBanner(null);

      const res = await fetch('/api/sync', { method: 'POST' });
      const data = await res.json();

      if (res.ok && data.success) {
        const githubRes = (data.results as SyncResult[])?.find((r) => r.source === 'github');
        if (githubRes) {
          if (githubRes.errors && githubRes.errors.length > 0) {
            setBanner({
              type: 'error',
              message: `Sync issue: ${githubRes.errors.join(', ')}`,
            });
          } else {
            const parts = [
              `${githubRes.fetched} fetched`,
              `${githubRes.created} new`,
              `${githubRes.updated} updated`,
              `${githubRes.autoResolved} resolved`,
            ];
            if (githubRes.removed && githubRes.removed > 0) {
              parts.push(`${githubRes.removed} unassigned removed`);
            }
            setBanner({
              type: 'success',
              message: `Synced with GitHub: ${parts.join(', ')}.`,
            });
            setTimeout(() => setBanner(null), 5000);
          }
        }
        setLastSyncTime(new Date().toISOString());
        setJustSynced(true);
        setTimeout(() => setJustSynced(false), 2500);
        await refreshTasks();
      } else {
        setBanner({
          type: 'error',
          message: data.error || 'Failed to sync with GitHub',
        });
      }
    } catch {
      setBanner({
        type: 'error',
        message: 'Network error occurred while syncing.',
      });
    } finally {
      setIsSyncing(false);
    }
  }, [refreshTasks]);

  // Check PAT status
  const checkSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setHasPat(data.hasPat || false);
      }
    } catch {
      // ignore
    }
  }, []);

  // Setup periodic background polling if PAT is configured
  useEffect(() => {
    const interval = setInterval(() => {
      if (hasPat) {
        handleSync();
      }
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(interval);
  }, [hasPat, handleSync]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      <Navbar
        onSync={handleSync}
        isSyncing={isSyncing}
        justSynced={justSynced}
        lastSyncTime={lastSyncTime}
        searchFilter={searchFilter}
        onSearchChange={setSearchFilter}
        sourceFilter={sourceFilter}
        onSourceFilterChange={setSourceFilter}
        onClearFilters={handleClearFilters}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenNewTask={() => setIsNewTaskOpen(true)}
        totalTaskCount={tasks.filter((t) => t.status !== 'done').length}
      />

      {/* PAT Missing Callout */}
      {!hasPat && (
        <div className="bg-gradient-to-r from-indigo-950/80 to-purple-950/80 border-b border-indigo-800/50 px-4 py-3">
          <div className="max-w-[1920px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2.5 text-indigo-200">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>
                <strong>GitHub Token not configured:</strong> Add your GitHub Personal Access Token to start automatically ingesting your assigned PRs and issues.
              </span>
            </div>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shrink-0 transition-colors"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Configure GitHub PAT</span>
            </button>
          </div>
        </div>
      )}

      {/* Sync Status Banner */}
      {banner && (
        <div
          className={`px-4 py-2.5 border-b text-xs flex items-center justify-between transition-all ${
            banner.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300'
              : banner.type === 'error'
              ? 'bg-rose-950/60 border-rose-800/60 text-rose-300'
              : 'bg-zinc-900 border-zinc-800 text-zinc-300'
          }`}
        >
          <div className="max-w-[1920px] mx-auto flex items-center gap-2 w-full">
            {banner.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{banner.message}</span>
          </div>
        </div>
      )}

      {/* Kanban Board Canvas */}
      <main className="flex-1 p-4 max-w-[1920px] mx-auto w-full">
        <KanbanBoard
          tasks={tasks}
          setTasks={setTasks}
          searchFilter={searchFilter}
          sourceFilter={sourceFilter}
          onClearFilters={handleClearFilters}
        />
      </main>

      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSaveSuccess={() => {
          checkSettings();
          handleSync();
        }}
      />

      <NewTaskModal
        isOpen={isNewTaskOpen}
        onClose={() => setIsNewTaskOpen(false)}
        onTaskCreated={refreshTasks}
      />
    </div>
  );
}
