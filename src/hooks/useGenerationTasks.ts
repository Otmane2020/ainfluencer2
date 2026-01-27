import { useState, useEffect, useCallback, useRef } from "react";

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

// Custom event name for cross-component sync
const SYNC_EVENT = "generation_tasks_sync";

export const useGenerationTasks = () => {
  const [tasks, setTasks] = useState<GenerationTask[]>([]);
  const isInternalUpdate = useRef(false);
  const instanceId = useRef(Math.random().toString(36).substring(7));

  // Load tasks from localStorage
  const loadTasksFromStorage = useCallback(() => {
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
        return recentTasks;
      } catch (e) {
        console.error("Failed to parse stored tasks:", e);
        return [];
      }
    }
    return [];
  }, []);

  // Load tasks from localStorage on mount
  useEffect(() => {
    const loaded = loadTasksFromStorage();
    setTasks(loaded);
  }, [loadTasksFromStorage]);

  // Listen for sync events from other hook instances
  useEffect(() => {
    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<{ sourceId: string; tasks: GenerationTask[] }>;
      // Only update if event came from a different instance
      if (customEvent.detail && customEvent.detail.sourceId !== instanceId.current) {
        isInternalUpdate.current = true;
        setTasks(customEvent.detail.tasks);
        setTimeout(() => { isInternalUpdate.current = false; }, 0);
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as GenerationTask[];
          isInternalUpdate.current = true;
          setTasks(parsed);
          setTimeout(() => { isInternalUpdate.current = false; }, 0);
        } catch {
          // Ignore parse errors
        }
      }
    };

    window.addEventListener(SYNC_EVENT, handleSync);
    window.addEventListener("storage", handleStorageChange);
    
    return () => {
      window.removeEventListener(SYNC_EVENT, handleSync);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Persist tasks to localStorage and notify other instances
  useEffect(() => {
    // Skip if this was triggered by receiving an external update
    if (isInternalUpdate.current) {
      return;
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    
    // Dispatch event for other hook instances in the same tab
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { 
      detail: { sourceId: instanceId.current, tasks } 
    }));
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
