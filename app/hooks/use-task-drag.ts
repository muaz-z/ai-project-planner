import { useState } from "react";

interface DraggedTask {
  phaseIndex: number;
  taskIndex: number;
}

export function useTaskDrag(
  handleTaskReorder: (params: {
    phaseIndex: number;
    fromTaskIndex: number;
    toTaskIndex: number;
  }) => void,
) {
  const [draggedTask, setDraggedTask] = useState<DraggedTask | null>(null);
  const [dragOverTask, setDragOverTask] = useState<DraggedTask | null>(null);

  const handleTaskDragStart = (
    e: React.DragEvent,
    phaseIndex: number,
    taskIndex: number,
  ) => {
    e.stopPropagation(); // Prevent phase drag
    setDraggedTask({ phaseIndex, taskIndex });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleTaskDragOver = (
    e: React.DragEvent,
    phaseIndex: number,
    taskIndex: number,
  ) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent phase drag
    e.dataTransfer.dropEffect = "move";
    setDragOverTask({ phaseIndex, taskIndex });
  };

  const handleTaskDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    setDragOverTask(null);
  };

  const handleTaskDrop = (
    e: React.DragEvent,
    toPhaseIndex: number,
    toTaskIndex: number,
  ) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent phase drop

    if (draggedTask && draggedTask.phaseIndex === toPhaseIndex) {
      handleTaskReorder({
        phaseIndex: toPhaseIndex,
        fromTaskIndex: draggedTask.taskIndex,
        toTaskIndex,
      });
    }
    setDraggedTask(null);
    setDragOverTask(null);
  };

  const handleTaskDragEnd = (e: React.DragEvent) => {
    e.stopPropagation();
    setDraggedTask(null);
    setDragOverTask(null);
  };

  return {
    draggedTask,
    dragOverTask,
    handleTaskDragStart,
    handleTaskDragOver,
    handleTaskDragLeave,
    handleTaskDrop,
    handleTaskDragEnd,
  };
}
