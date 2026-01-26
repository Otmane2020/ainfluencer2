import { useState, useEffect, useCallback } from "react";

export interface GenerationTask {
  id: string;
  taskId: string;
  status: "queued" | "in_progress" | "completed" | "failed";
  progress: number;
  submitTime?: number;
  finishTime?: number;
  duration: number;
  model: string;
  amount: number;
  videoUrl?: string;
  script?: string;
}

const STORAGE_KEY = "generation_tasks";

export const useGenerationTasks = () => {
  const [tasks, setTasks] = useState<GenerationTask[]>([]);

  // Load tasks from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as GenerationTask[];
        // Filter out old completed/failed tasks (older than 24h)
        const now = Date.now() / 1000;
        const recentTasks = parsed.filter(task => {
          if (task.status === "completed" || task.status === "failed") {
            return task.finishTime && (now - task.finishTime) < 86400;
          }
          return true;
        });
        setTasks(recentTasks);
      } catch (e) {
        console.error("Failed to parse stored tasks:", e);
      }
    }
  }, []);

  // Persist tasks to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  const addTask = useCallback((task: GenerationTask) => {
    setTasks(prev => {
      const existing = prev.find(t => t.taskId === task.taskId);
      if (existing) {
        return prev.map(t => t.taskId === task.taskId ? { ...t, ...task } : t);
      }
      return [...prev, task];
    });
  }, []);

  const updateTask = useCallback((taskId: string, updates: Partial<GenerationTask>) => {
    setTasks(prev => prev.map(t => 
      t.taskId === taskId ? { ...t, ...updates } : t
    ));
  }, []);

  const removeTask = useCallback((taskId: string) => {
    setTasks(prev => prev.filter(t => t.taskId !== taskId));
  }, []);

  const getActiveTasks = useCallback(() => {
    return tasks.filter(t => t.status !== "completed" && t.status !== "failed");
  }, [tasks]);

  const getPendingTasks = useCallback(() => {
    return tasks.filter(t => t.status === "queued" || t.status === "in_progress");
  }, [tasks]);

  const clearCompletedTasks = useCallback(() => {
    setTasks(prev => prev.filter(t => t.status !== "completed" && t.status !== "failed"));
  }, []);

  return {
    tasks,
    setTasks,
    addTask,
    updateTask,
    removeTask,
    getActiveTasks,
    getPendingTasks,
    clearCompletedTasks,
  };
};
