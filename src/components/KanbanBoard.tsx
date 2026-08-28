'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Task, TaskStatus } from '@/db/schema';
import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';

interface KanbanBoardProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  searchFilter: string;
  sourceFilter: string;
  onClearFilters?: () => void;
}

const COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: 'inbox', title: 'Inbox' },
  { id: 'next', title: 'Next Actions' },
  { id: 'in_progress', title: 'In Progress' },
  { id: 'waiting', title: 'Waiting On' },
  { id: 'done', title: 'Done' },
];

export function KanbanBoard({
  tasks,
  setTasks,
  searchFilter,
  sourceFilter,
  onClearFilters,
}: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const updateServerTask = useCallback(async (taskId: string, status?: TaskStatus, sortOrder?: number) => {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, sortOrder }),
      });
    } catch (err) {
      console.error('Failed to sync task status with server', err);
    }
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px movement required before drag starts to allow clicks
      },
    })
  );

  const handleMoveColumn = useCallback(
    (taskId: string, targetStatus: TaskStatus) => {
      const now = new Date().toISOString();
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, status: targetStatus, statusUpdatedAt: now }
            : t
        )
      );
      updateServerTask(taskId, targetStatus);
    },
    [setTasks, updateServerTask]
  );

  const handleDeleteTask = useCallback(
    async (taskId: string) => {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      try {
        await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      } catch (err) {
        console.error('Failed to delete task', err);
      }
    },
    [setTasks]
  );

  const onDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const activeTaskItem = tasks.find((t) => t.id === activeId);
    if (!activeTaskItem) return;

    const isOverColumn = COLUMNS.some((col) => col.id === overId);
    const overTaskItem = tasks.find((t) => t.id === overId);

    if (isOverColumn) {
      const targetColumn = overId as TaskStatus;
      if (activeTaskItem.status !== targetColumn) {
        const now = new Date().toISOString();
        setTasks((prev) =>
          prev.map((t) =>
            t.id === activeId
              ? { ...t, status: targetColumn, statusUpdatedAt: now }
              : t
          )
        );
      }
    } else if (overTaskItem && activeTaskItem.status !== overTaskItem.status) {
      const now = new Date().toISOString();
      setTasks((prev) => {
        const activeIdx = prev.findIndex((t) => t.id === activeId);
        const overIdx = prev.findIndex((t) => t.id === overId);

        const updated = [...prev];
        updated[activeIdx] = {
          ...updated[activeIdx],
          status: overTaskItem.status,
          statusUpdatedAt: now,
        };
        return arrayMove(updated, activeIdx, overIdx);
      });
    }
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTaskItem = tasks.find((t) => t.id === activeId);
    if (!activeTaskItem) return;

    const isOverColumn = COLUMNS.some((col) => col.id === overId);

    if (isOverColumn) {
      const targetStatus = overId as TaskStatus;
      setTasks((prev) =>
        prev.map((t) =>
          t.id === activeId ? { ...t, status: targetStatus } : t
        )
      );
      updateServerTask(activeId, targetStatus);
    } else {
      const overTaskItem = tasks.find((t) => t.id === overId);
      if (overTaskItem) {
        const activeIdx = tasks.findIndex((t) => t.id === activeId);
        const overIdx = tasks.findIndex((t) => t.id === overId);

        if (activeIdx !== overIdx || activeTaskItem.status !== overTaskItem.status) {
          setTasks((prev) =>
            arrayMove(prev, activeIdx, overIdx).map((t, idx) =>
              t.id === activeId
                ? { ...t, status: overTaskItem.status, sortOrder: idx }
                : { ...t, sortOrder: idx }
            )
          );
          updateServerTask(activeId, overTaskItem.status);
        }
      }
    }
  };

  // Filter tasks based on search & source filters
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (sourceFilter !== 'all') {
        if (sourceFilter === 'github_pr' && task.sourceType !== 'pr') return false;
        if (sourceFilter === 'github_issue' && task.sourceType !== 'issue') return false;
        if (sourceFilter === 'review_request' && task.sourceType !== 'review_request') return false;
      }

      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        const matchTitle = task.title.toLowerCase().includes(q);
        const matchRepo = (task.repository || '').toLowerCase().includes(q);
        const matchAuthor = (task.author || '').toLowerCase().includes(q);
        return matchTitle || matchRepo || matchAuthor;
      }

      return true;
    });
  }, [tasks, searchFilter, sourceFilter]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 pt-1 px-1 min-h-[calc(100vh-140px)] items-start">
        {COLUMNS.map((col) => {
          const colTasks = filteredTasks.filter((t) => t.status === col.id);
          return (
            <KanbanColumn
              key={col.id}
              id={col.id}
              title={col.title}
              tasks={colTasks}
              hasActiveFilters={Boolean(searchFilter.trim()) || sourceFilter !== 'all'}
              onClearFilters={onClearFilters}
              onMoveColumn={handleMoveColumn}
              onDeleteTask={handleDeleteTask}
            />
          );
        })}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <div className="w-[320px]">
            <TaskCard task={activeTask} isOverlay />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
