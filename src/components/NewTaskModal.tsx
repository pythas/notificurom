'use client';

import React, { useState } from 'react';
import { X, Plus, CheckCircle } from 'lucide-react';
import { TaskStatus } from '@/db/schema';

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated?: () => void;
}

export function NewTaskModal({ isOpen, onClose, onTaskCreated }: NewTaskModalProps) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [repository, setRepository] = useState('');
  const [status, setStatus] = useState<TaskStatus>('inbox');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          url: url.trim() || undefined,
          repository: repository.trim() || undefined,
          status,
          source: 'manual',
          sourceType: 'task',
        }),
      });

      if (res.ok) {
        setTitle('');
        setUrl('');
        setRepository('');
        setStatus('inbox');
        onTaskCreated?.();
        onClose();
      } else {
        const err = await res.json();
        setError(err.error || 'Failed to create task');
      }
    } catch {
      setError('Failed to create task');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-lg flex flex-col text-zinc-100 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-indigo-400" />
            <h3 className="font-semibold text-base">New Action Item</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1">
              Title / Task Description *
            </label>
            <textarea
              required
              rows={3}
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-100 placeholder:text-zinc-600 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1">
                Context / Repo (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. backend/auth"
                value={repository}
                onChange={(e) => setRepository(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-100 placeholder:text-zinc-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1">
                Initial Column
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-100"
              >
                <option value="inbox">Inbox</option>
                <option value="next">Next Actions</option>
                <option value="in_progress">In Progress</option>
                <option value="waiting">Waiting On</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1">
              URL / Link (Optional)
            </label>
            <input
              type="url"
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-100 placeholder:text-zinc-600"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg shadow-sm transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{saving ? 'Creating...' : 'Create Item'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
