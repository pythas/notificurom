'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task, TaskStatus } from '@/db/schema';
import { AgeBadge } from './AgeBadge';
import {
  ExternalLink,
  GitPullRequest,
  CircleDot,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  GripVertical,
} from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onMoveColumn?: (taskId: string, targetStatus: TaskStatus) => void;
  onDelete?: (taskId: string) => void;
  isOverlay?: boolean;
}

const STATUS_ORDER: TaskStatus[] = ['inbox', 'next', 'in_progress', 'waiting', 'done'];

interface CardLabel {
  name: string;
  color?: string;
  description?: string;
}

interface CardMetadata {
  labels?: CardLabel[];
  [key: string]: unknown;
}

export function TaskCard({ task, onMoveColumn, onDelete, isOverlay = false }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: 'Task',
      task,
    },
    disabled: isOverlay,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Parse metadata
  let metadata: CardMetadata = {};
  try {
    if (task.metadata) {
      metadata = JSON.parse(task.metadata);
    }
  } catch {
    metadata = {};
  }

  const currentIndex = STATUS_ORDER.indexOf(task.status as TaskStatus);
  const prevStatus = currentIndex > 0 ? STATUS_ORDER[currentIndex - 1] : null;
  const nextStatus = currentIndex < STATUS_ORDER.length - 1 ? STATUS_ORDER[currentIndex + 1] : null;

  const renderSourceIcon = () => {
    if (task.sourceType === 'review_request') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800/50">
          <Eye className="w-3 h-3" />
          <span>Review Request</span>
        </span>
      );
    }
    if (task.sourceType === 'pr') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-800/50">
          <GitPullRequest className="w-3 h-3" />
          <span>PR</span>
        </span>
      );
    }
    if (task.sourceType === 'issue') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/50">
          <CircleDot className="w-3 h-3" />
          <span>Issue</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
        <span>Task</span>
      </span>
    );
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 rounded-lg p-3.5 shadow-sm transition-all text-zinc-100 flex flex-col gap-2.5 select-none ${
        isDragging ? 'opacity-30 border-dashed border-indigo-500' : ''
      } ${isOverlay ? 'shadow-2xl ring-2 ring-indigo-500/80 rotate-1 scale-102 bg-zinc-900 z-50 cursor-grabbing' : ''}`}
    >
      {/* Card Header: Source / Type Badge + Repo + External Link */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-hidden flex-wrap">
          {renderSourceIcon()}
          {task.repository && (
            <span
              className="text-xs font-mono text-zinc-400 truncate max-w-[150px]"
              title={task.repository}
            >
              {task.repository}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {task.url && (
            <a
              href={task.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
              title="Open in GitHub"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          {!isOverlay && (
            <div
              {...attributes}
              {...listeners}
              className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 cursor-grab active:cursor-grabbing transition-colors"
              title="Drag to reorder or move column"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
      </div>

      {/* Card Title */}
      <div className="text-sm font-medium leading-snug line-clamp-3 text-zinc-100">
        {task.title}
      </div>

      {/* Labels / Tags if available */}
      {Array.isArray(metadata.labels) && metadata.labels.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {metadata.labels.slice(0, 3).map((l: CardLabel, idx: number) => (
            <span
              key={idx}
              className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium truncate max-w-[120px]"
              style={{
                backgroundColor: l.color ? `#${l.color}22` : '#27272a',
                color: l.color ? `#${l.color}` : '#a1a1aa',
                borderColor: l.color ? `#${l.color}44` : '#3f3f46',
                borderWidth: '1px',
              }}
              title={l.description || l.name}
            >
              {l.name}
            </span>
          ))}
          {metadata.labels.length > 3 && (
            <span className="text-[10px] text-zinc-500 font-mono">
              +{metadata.labels.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Card Footer: Age Badge + Author Avatar + Quick Actions */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-800/60 mt-0.5">
        <AgeBadge
          sourceCreatedAt={task.sourceCreatedAt}
          statusUpdatedAt={task.statusUpdatedAt}
          isDone={task.status === 'done'}
        />

        <div className="flex items-center gap-1">
          {task.author && (
            <div
              className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono"
              title={`Author: ${task.author}`}
            >
              {task.authorAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={task.authorAvatarUrl}
                  alt={task.author}
                  className="w-4 h-4 rounded-full"
                />
              ) : (
                <span className="w-4 h-4 rounded-full bg-zinc-800 flex items-center justify-center text-[10px]">
                  {task.author.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="truncate max-w-[65px]">{task.author}</span>
            </div>
          )}

          {/* Quick column movement buttons */}
          {!isOverlay && onMoveColumn && (
            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity ml-1">
              {prevStatus && (
                <button
                  type="button"
                  onClick={() => onMoveColumn(task.id, prevStatus)}
                  className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
                  title={`Move back to ${prevStatus}`}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              )}
              {nextStatus && (
                <button
                  type="button"
                  onClick={() => onMoveColumn(task.id, nextStatus)}
                  className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
                  title={`Move forward to ${nextStatus}`}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(task.id)}
                  className="p-1 text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 rounded transition-colors"
                  title="Remove from board"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
