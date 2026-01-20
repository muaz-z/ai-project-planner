import { useMemo } from "react";
import { z } from "zod";
import { taskSchema, phaseSchema } from "@/lib/schema";

type Task = z.infer<typeof taskSchema>;
type Phase = z.infer<typeof phaseSchema>;

export function usePlanProgress(phases: Phase[]) {
  const { allTasks, completedTasks, overallProgress } = useMemo(() => {
    const tasks = phases.flatMap((phase) => phase.tasks);
    const completed = tasks.filter(
      (task) => task.status === "completed",
    ).length;
    const progress =
      tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;

    return {
      allTasks: tasks,
      completedTasks: completed,
      overallProgress: progress,
    };
  }, [phases]);

  const getPhaseProgress = useMemo(
    () => (tasks: Task[]) => {
      if (tasks.length === 0) return 0;
      const completed = tasks.filter((t) => t.status === "completed").length;
      return Math.round((completed / tasks.length) * 100);
    },
    [],
  );

  return {
    allTasks,
    completedTasks,
    overallProgress,
    getPhaseProgress,
  };
}
