import { useState } from "react";

export function usePhaseDrag(
  handlePhaseReorder: (params: { fromIndex: number; toIndex: number }) => void,
) {
  const [draggedPhaseIndex, setDraggedPhaseIndex] = useState<number | null>(
    null,
  );
  const [dragOverPhaseIndex, setDragOverPhaseIndex] = useState<number | null>(
    null,
  );

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedPhaseIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverPhaseIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverPhaseIndex(null);
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (draggedPhaseIndex !== null) {
      handlePhaseReorder({ fromIndex: draggedPhaseIndex, toIndex });
    }
    setDraggedPhaseIndex(null);
    setDragOverPhaseIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedPhaseIndex(null);
    setDragOverPhaseIndex(null);
  };

  return {
    draggedPhaseIndex,
    dragOverPhaseIndex,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
  };
}
