'use client';

import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Task, TaskStatus } from '@/db/schema';
import { TaskCard } from './TaskCard';
import {
  Inbox,
  ArrowRightCircle,
  PlayCircle,
  PauseCircle,
  CheckCircle,
  ArrowUpDown,
} from 'lucide-react';

export type SortMode = 'default' | 'oldest' | 'newest' | 'stalled';

interface KanbanColumnProps {
  id: TaskStatus;
  title: string;
  tasks: Task[];
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  onMoveColumn: (taskId: string, targetStatus: TaskStatus) => void;
  onDeleteTask: (taskId: string) => void;
}

const COLUMN_CONFIG: Record<
  TaskStatus,
  {
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
    description: string;
  }
> = {
  inbox: {
    icon: Inbox,
    accentColor: 'border-t-blue-500 text-blue-400',
    description: 'New incoming assignments & PRs',
  },
  next: {
    icon: ArrowRightCircle,
    accentColor: 'border-t-amber-500 text-amber-400',
    description: 'Committed tasks to do next',
  },
  in_progress: {
    icon: PlayCircle,
    accentColor: 'border-t-purple-500 text-purple-400',
    description: 'Currently working on',
  },
  waiting: {
    icon: PauseCircle,
    accentColor: 'border-t-orange-500 text-orange-400',
    description: 'Waiting on reviews, CI, or others',
  },
  done: {
    icon: CheckCircle,
    accentColor: 'border-t-emerald-500 text-emerald-400',
    description: 'Completed or merged assignments',
  },
};

export function KanbanColumn({
  id,
  title,
  tasks,
  hasActiveFilters = false,
  onClearFilters,
  onMoveColumn,
  onDeleteTask,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      type: 'Column',
      columnId: id,
    },
  });

  const [sortMode, setSortMode] = useState<SortMode>('default');

  const config = COLUMN_CONFIG[id];
  const Icon = config.icon;

  // Sorting
  const sortedTasks = [...tasks].sort((a, b) => {
    if (sortMode === 'oldest') {
      return new Date(a.sourceCreatedAt).getTime() - new Date(b.sourceCreatedAt).getTime();
    }
    if (sortMode === 'newest') {
      return new Date(b.sourceCreatedAt).getTime() - new Date(a.sourceCreatedAt).getTime();
    }
    if (sortMode === 'stalled') {
      return new Date(a.statusUpdatedAt).getTime() - new Date(b.statusUpdatedAt).getTime();
    }
    // default order: sortOrder then sourceCreatedAt desc
    if (a.sortOrder !== b.sortOrder) {
      return a.sortOrder - b.sortOrder;
    }
    return new Date(b.sourceCreatedAt).getTime() - new Date(a.sourceCreatedAt).getTime();
  });

  return (
    <div
      ref={setNodeRef}
      data-column-id={id}
      data-testid={`column-${id}`}
      className={`flex flex-col flex-1 min-w-[300px] max-w-[360px] bg-zinc-950/80 border border-zinc-800/80 rounded-xl overflow-hidden shadow-lg transition-colors border-t-4 ${
        config.accentColor
      } ${isOver ? 'ring-2 ring-indigo-500/50 bg-zinc-900/50' : ''}`}
    >
      {/* Column Header */}
      <div className="p-3.5 border-b border-zinc-800/60 flex items-center justify-between gap-2 bg-zinc-900/40">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" />
          <h2 className="text-sm font-semibold text-zinc-100 tracking-wide">{title}</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono font-medium">
            {tasks.length}
          </span>
        </div>

        {/* Column Sort Options */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              const modes: SortMode[] = ['default', 'oldest', 'newest', 'stalled'];
              const nextIdx = (modes.indexOf(sortMode) + 1) % modes.length;
              setSortMode(modes[nextIdx]);
            }}
            className={`p-1 text-xs rounded flex items-center gap-1 transition-colors ${
              sortMode !== 'default'
                ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-700/50'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
            title={`Sorting: ${sortMode}. Click to cycle (Default -> Oldest -> Newest -> Stalled)`}
          >
            <ArrowUpDown className="w-3 h-3" />
            {sortMode !== 'default' && (
              <span className="text-[10px] uppercase font-mono font-bold">{sortMode}</span>
            )}
          </button>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 p-3 flex flex-col gap-2.5 overflow-y-auto max-h-[calc(100vh-210px)] min-h-[160px]">
        <SortableContext
          items={sortedTasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {sortedTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onMoveColumn={onMoveColumn}
              onDelete={onDeleteTask}
            />
          ))}
        </SortableContext>

        {sortedTasks.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-zinc-800/60 rounded-lg text-center text-zinc-500 text-xs gap-2">
            <span>
              {hasActiveFilters ? 'No tasks match filters' : `No tasks in ${title.toLowerCase()}`}
            </span>
            {hasActiveFilters && onClearFilters && (
              <button
                type="button"
                onClick={onClearFilters}
                className="text-xs text-indigo-400 hover:text-indigo-300 underline font-medium transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
